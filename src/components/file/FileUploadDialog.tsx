import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import type { PulpListResponse, Repository } from '../../types/pulp';
import { apiService, formatPulpApiError } from '../../services/api';
import { parsePulpLabelsJson } from '../../utils/pulp';
import { buildFormDataCurlCommand } from '../../utils/curl';
import { CurlPreviewButton } from '../CurlPreviewButton';

const CONTENT_ENDPOINT = '/content/file/files/';

interface UploadFormData {
  repository: string;
  relative_path: string;
  file: File | null;
  artifact: string;
  upload: string;
  file_url: string;
  pulp_labels: string;
}

const EMPTY_FORM: UploadFormData = {
  repository: '',
  relative_path: '',
  file: null,
  artifact: '',
  upload: '',
  file_url: '',
  pulp_labels: '',
};

interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called after the upload task was submitted, with a snackbar message. */
  onUploaded: (message: string) => void;
}

/**
 * Uploads a file content unit into a file repository
 * (POST /content/file/files/, which returns a task).
 */
export const FileUploadDialog: React.FC<FileUploadDialogProps> = ({ open, onClose, onUploaded }) => {
  const [form, setForm] = useState<UploadFormData>(EMPTY_FORM);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setError(null);

    const fetchRepositories = async () => {
      try {
        const response = await apiService.get<PulpListResponse<Repository>>(
          '/repositories/file/file/'
        );
        setRepositories(response.results);
      } catch {
        // optional; the repository select just stays empty
      }
    };
    void fetchRepositories();
  }, [open]);

  const handleClose = () => {
    if (uploading) return;
    onClose();
  };

  /** Shared by the upload handler and the "Show curl" preview. */
  const buildUploadForm = (): { formData: FormData } | { error: string } => {
    const repository = form.repository.trim();
    const relativePath = form.relative_path.trim();
    const artifact = form.artifact.trim();
    const upload = form.upload.trim();
    const fileUrl = form.file_url.trim();

    if (!repository) {
      return { error: 'Repository is required' };
    }
    if (!relativePath) {
      return { error: 'Relative path is required' };
    }

    const sources = [
      form.file ? 'file' : null,
      artifact ? 'artifact' : null,
      upload ? 'upload' : null,
      fileUrl ? 'file_url' : null,
    ].filter(Boolean) as Array<'file' | 'artifact' | 'upload' | 'file_url'>;

    if (sources.length === 0) {
      return { error: 'Provide a file (or artifact/upload/file_url)' };
    }
    if (sources.length > 1) {
      return { error: 'Provide only one source: file, artifact, upload, or file_url' };
    }

    const { labels, error: labelsError } = parsePulpLabelsJson(form.pulp_labels);
    if (labelsError) {
      return { error: labelsError };
    }

    const formData = new FormData();
    formData.append('repository', repository);
    formData.append('relative_path', relativePath);
    if (labels && Object.keys(labels).length > 0) {
      formData.append('pulp_labels', JSON.stringify(labels));
    }
    if (sources[0] === 'file') formData.append('file', form.file as File);
    else if (sources[0] === 'artifact') formData.append('artifact', artifact);
    else if (sources[0] === 'upload') formData.append('upload', upload);
    else formData.append('file_url', fileUrl);

    return { formData };
  };

  const handleUpload = async () => {
    const built = buildUploadForm();
    if ('error' in built) {
      setError(built.error);
      return;
    }

    try {
      setUploading(true);
      const resp = await apiService.post<{ task?: string }>(CONTENT_ENDPOINT, built.formData);
      onUploaded(resp?.task ? 'File upload task started' : 'File upload request submitted');
      onClose();
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to upload file'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload File</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}

          <TextField
            select
            label="Repository"
            fullWidth
            value={form.repository}
            onChange={(e) => setForm((p) => ({ ...p, repository: e.target.value }))}
            required
            helperText="Repository the new file content unit should be associated with"
          >
            {repositories.map((repo) => (
              <MenuItem key={repo.pulp_href} value={repo.pulp_href}>
                {repo.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Relative Path"
            fullWidth
            value={form.relative_path}
            onChange={(e) => setForm((p) => ({ ...p, relative_path: e.target.value }))}
            required
            helperText="Path where the file will be located relative to the distribution base_path"
          />

          <Button variant="outlined" component="label">
            Choose File
            <input
              type="file"
              hidden
              onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
            />
          </Button>
          {form.file && (
            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{form.file.name}</Box>
          )}

          <TextField
            label="Artifact (href)"
            fullWidth
            value={form.artifact}
            onChange={(e) => setForm((p) => ({ ...p, artifact: e.target.value }))}
            helperText="Optional. Provide exactly one source: file, artifact, upload, or file_url."
          />
          <TextField
            label="Upload (href)"
            fullWidth
            value={form.upload}
            onChange={(e) => setForm((p) => ({ ...p, upload: e.target.value }))}
            helperText="Optional. Provide exactly one source: file, artifact, upload, or file_url."
          />
          <TextField
            label="File URL"
            fullWidth
            value={form.file_url}
            onChange={(e) => setForm((p) => ({ ...p, file_url: e.target.value }))}
            helperText="Optional. Provide exactly one source: file, artifact, upload, or file_url."
          />
          <TextField
            label="pulp_labels (JSON)"
            fullWidth
            value={form.pulp_labels}
            onChange={(e) => setForm((p) => ({ ...p, pulp_labels: e.target.value }))}
            helperText='Optional JSON object, e.g. {"env":"dev"}'
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <CurlPreviewButton
          getCommand={() => {
            const built = buildUploadForm();
            if ('error' in built) return `# ${built.error}`;
            return buildFormDataCurlCommand('POST', CONTENT_ENDPOINT, built.formData);
          }}
        />
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button onClick={handleUpload} variant="contained" disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
