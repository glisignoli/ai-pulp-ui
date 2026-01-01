import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService, formatPulpApiError } from '../../services/api';
import { FileContent, PulpListResponse } from '../../types/pulp';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

type TaskResponse = { task?: string };

export const FileContentFiles: React.FC = () => {
  const navigate = useNavigate();

  const [contents, setContents] = useState<FileContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [repositoryHref, setRepositoryHref] = useState('');
  const [relativePath, setRelativePath] = useState('');
  const [artifactHref, setArtifactHref] = useState('');
  const [uploadHref, setUploadHref] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [pulpLabelsJson, setPulpLabelsJson] = useState('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const fetchContents = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<FileContent>>('/content/file/files/?limit=100');
      setContents(response?.results || []);
      setError(null);
    } catch {
      setError('Failed to load file contents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  const openUpload = () => {
    setSelectedFile(null);
    setRepositoryHref('');
    setRelativePath('');
    setArtifactHref('');
    setUploadHref('');
    setFileUrl('');
    setPulpLabelsJson('');
    setUploadOpen(true);
  };

  const closeUpload = () => {
    if (uploading) return;
    setUploadOpen(false);
  };

  const handleUpload = async () => {
    const trimmedRepositoryHref = repositoryHref.trim();
    const trimmedRelativePath = relativePath.trim();
    const trimmedArtifactHref = artifactHref.trim();
    const trimmedUploadHref = uploadHref.trim();
    const trimmedFileUrl = fileUrl.trim();
    const trimmedPulpLabelsJson = pulpLabelsJson.trim();

    if (!trimmedRelativePath) {
      setSnackbarMessage('Relative path is required');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const sources = [
      selectedFile ? 'file' : null,
      trimmedArtifactHref ? 'artifact' : null,
      trimmedUploadHref ? 'upload' : null,
      trimmedFileUrl ? 'file_url' : null,
    ].filter(Boolean) as Array<'file' | 'artifact' | 'upload' | 'file_url'>;

    if (sources.length === 0) {
      setSnackbarMessage('Provide a file (or artifact/upload/file_url)');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (sources.length > 1) {
      setSnackbarMessage('Provide only one source: file, artifact, upload, or file_url');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    let pulpLabels: Record<string, string> | undefined;
    if (trimmedPulpLabelsJson) {
      try {
        const parsed = JSON.parse(trimmedPulpLabelsJson) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('pulp_labels must be a JSON object');
        }

        const record: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof value !== 'string') {
            throw new Error('pulp_labels values must be strings');
          }
          record[key] = value;
        }
        pulpLabels = record;
      } catch {
        setSnackbarMessage('Invalid pulp_labels JSON (must be an object of string values)');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
    }

    try {
      setUploading(true);
      const form = new FormData();

      if (pulpLabels && Object.keys(pulpLabels).length > 0) {
        form.append('pulp_labels', JSON.stringify(pulpLabels));
      }

      if (trimmedRepositoryHref) {
        form.append('repository', trimmedRepositoryHref);
      }

      form.append('relative_path', trimmedRelativePath);

      if (sources[0] === 'file') {
        form.append('file', selectedFile as File);
      } else if (sources[0] === 'artifact') {
        form.append('artifact', trimmedArtifactHref);
      } else if (sources[0] === 'upload') {
        form.append('upload', trimmedUploadHref);
      } else if (sources[0] === 'file_url') {
        form.append('file_url', trimmedFileUrl);
      }

      const resp = await apiService.post<TaskResponse>('/content/file/files/', form);
      setSnackbarMessage(resp?.task ? 'File upload task started' : 'File upload request submitted');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setUploadOpen(false);
      await fetchContents();
    } catch (err) {
      setSnackbarMessage(formatPulpApiError(err, 'Failed to upload file'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">File Contents</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openUpload}>
          Upload File
        </Button>
      </Box>

      <ForegroundSnackbar
        open={!!error}
        message={error ?? ''}
        severity="error"
        onClose={() => setError(null)}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Relative Path</TableCell>
              <TableCell>SHA256</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No file contents found
                </TableCell>
              </TableRow>
            ) : (
              contents.map((content) => (
                <TableRow key={content.pulp_href}>
                  <TableCell>{content.relative_path}</TableCell>
                  <TableCell>{content.sha256 || 'N/A'}</TableCell>
                  <TableCell>
                    {content.pulp_created ? new Date(content.pulp_created).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() =>
                        navigate(`/file/content/files/view?href=${encodeURIComponent(content.pulp_href)}`)
                      }
                      aria-label="view"
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={uploadOpen} onClose={closeUpload} maxWidth="sm" fullWidth>
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button variant="outlined" component="label" disabled={uploading}>
              Choose File
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
              />
            </Button>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {selectedFile ? selectedFile.name : 'No file selected'}
            </Typography>

            <TextField
              label="Repository"
              fullWidth
              value={repositoryHref}
              onChange={(e) => setRepositoryHref(e.target.value)}
              disabled={uploading}
              helperText="Optional. A URI of a repository to associate the new content with."
            />

            <TextField
              label="Relative Path"
              fullWidth
              value={relativePath}
              onChange={(e) => setRelativePath(e.target.value)}
              disabled={uploading}
              required
              helperText="Required. Path where the artifact is located relative to distributions base_path."
            />

            <TextField
              label="Artifact"
              fullWidth
              value={artifactHref}
              onChange={(e) => setArtifactHref(e.target.value)}
              disabled={uploading}
              helperText="Optional. Provide exactly one source: file, artifact, upload, or file_url."
            />
            <TextField
              label="Upload"
              fullWidth
              value={uploadHref}
              onChange={(e) => setUploadHref(e.target.value)}
              disabled={uploading}
              helperText="An uncommitted upload that may be turned into the content unit."
            />
            <TextField
              label="File URL"
              fullWidth
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              disabled={uploading}
              helperText="Optional. URL that Pulp can download and turn into the content unit."
            />
            <TextField
              label="Pulp Labels (JSON)"
              fullWidth
              multiline
              minRows={3}
              value={pulpLabelsJson}
              onChange={(e) => setPulpLabelsJson(e.target.value)}
              disabled={uploading}
              helperText='Optional. JSON object, e.g. {"env":"dev"}.'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUpload} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} variant="contained" disabled={uploading}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};
