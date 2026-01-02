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
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService, DEFAULT_PAGE_SIZE, formatPulpApiError, withPaginationParams } from '../../services/api';
import { PulpListResponse, Remote, Repository } from '../../types/pulp';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

interface RepositoryFormData {
  name: string;
  description: string;
  remote: string;
  retain_repo_versions: number | null;
  autopublish: boolean;
  manifest: string;
}

const parsePulpLabelsJson = (
  input: string
): { labels: Record<string, string> | null; error: string | null } => {
  const trimmed = input.trim();
  if (!trimmed) return { labels: null, error: null };

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { labels: null, error: 'Invalid pulp_labels JSON (must be an object of string values)' };
    }

    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        return { labels: null, error: 'Invalid pulp_labels JSON (must be an object of string values)' };
      }
      record[key] = value;
    }

    return { labels: record, error: null };
  } catch {
    return { labels: null, error: 'Invalid pulp_labels JSON (must be an object of string values)' };
  }
};

interface FileUploadFormState {
  repository: string;
  relative_path: string;
  file: File | null;
  artifact: string;
  upload: string;
  file_url: string;
  pulp_labels: string;
}

export const FileRepository: React.FC = () => {
  const navigate = useNavigate();

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRepository, setEditingRepository] = useState<Repository | null>(null);
  const [formData, setFormData] = useState<RepositoryFormData>({
    name: '',
    description: '',
    remote: '',
    retain_repo_versions: null,
    autopublish: false,
    manifest: 'PULP_MANIFEST',
  });

  const [pulpLabelsJson, setPulpLabelsJson] = useState('');
  const [pulpLabelsJsonError, setPulpLabelsJsonError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState<FileUploadFormState>({
    repository: '',
    relative_path: '',
    file: null,
    artifact: '',
    upload: '',
    file_url: '',
    pulp_labels: '',
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [repositoryToDelete, setRepositoryToDelete] = useState<Repository | null>(null);

  const fetchData = async (pageToLoad = page) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const [repoRes, remoteRes] = await Promise.all([
        apiService.get<PulpListResponse<Repository>>(
          withPaginationParams('/repositories/file/file/', { offset })
        ),
        apiService.get<PulpListResponse<Remote>>(withPaginationParams('/remotes/file/file/', { offset: 0 })),
      ]);
      setRepositories(repoRes.results);
      setTotalCount(repoRes.count);
      setRemotes(remoteRes.results);
      setError(null);
    } catch {
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(0);
  }, []);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    void fetchData(newPage);
  };

  const handleOpenDialog = (repo?: Repository) => {
    if (repo) {
      setEditingRepository(repo);
      setFormData({
        name: repo.name,
        description: (repo as any).description || '',
        remote: (repo as any).remote || '',
        retain_repo_versions: (repo as any).retain_repo_versions ?? null,
        autopublish: (repo as any).autopublish ?? false,
        manifest: (repo as any).manifest || 'PULP_MANIFEST',
      });
      setPulpLabelsJson(repo.pulp_labels ? JSON.stringify(repo.pulp_labels, null, 2) : '');
    } else {
      setEditingRepository(null);
      setFormData({
        name: '',
        description: '',
        remote: '',
        retain_repo_versions: null,
        autopublish: false,
        manifest: 'PULP_MANIFEST',
      });
      setPulpLabelsJson('');
    }
    setPulpLabelsJsonError(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRepository(null);
    setFormData({
      name: '',
      description: '',
      remote: '',
      retain_repo_versions: null,
      autopublish: false,
      manifest: 'PULP_MANIFEST',
    });
    setPulpLabelsJson('');
    setPulpLabelsJsonError(null);
  };

  const handleSubmit = async () => {
    try {
      const { labels: pulpLabels, error: labelsError } = parsePulpLabelsJson(pulpLabelsJson);
      setPulpLabelsJsonError(labelsError);
      if (labelsError) return;

      const retainFileVersionsInvalid =
        formData.retain_repo_versions !== null && formData.retain_repo_versions <= 0;
      if (retainFileVersionsInvalid) {
        setError("Retain File Versions must be > 0");
        return;
      }

      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        remote: formData.remote || null,
        retain_repo_versions: formData.retain_repo_versions ?? undefined,
        autopublish: formData.autopublish,
        manifest: formData.manifest.trim() || undefined,
      };

      if (pulpLabels && Object.keys(pulpLabels).length > 0) {
        payload.pulp_labels = pulpLabels;
      }

      if (editingRepository) {
        await apiService.put(editingRepository.pulp_href, payload);
        setSuccessMessage('Repository updated successfully');
      } else {
        await apiService.post('/repositories/file/file/', payload);
        setSuccessMessage('Repository created successfully');
      }

      handleCloseDialog();
      await fetchData();
    } catch {
      setError(`Failed to ${editingRepository ? 'update' : 'create'} repository`);
    }
  };

  const openUpload = () => {
    setUploadForm({
      repository: '',
      relative_path: '',
      file: null,
      artifact: '',
      upload: '',
      file_url: '',
      pulp_labels: '',
    });
    setUploadOpen(true);
  };

  const closeUpload = () => {
    if (uploading) return;
    setUploadOpen(false);
  };

  const handleUpload = async () => {
    const trimmedRepository = uploadForm.repository.trim();
    const trimmedRelativePath = uploadForm.relative_path.trim();
    const trimmedArtifact = uploadForm.artifact.trim();
    const trimmedUpload = uploadForm.upload.trim();
    const trimmedFileUrl = uploadForm.file_url.trim();
    const trimmedPulpLabels = uploadForm.pulp_labels.trim();

    if (!trimmedRepository) {
      setError('Repository is required');
      return;
    }

    if (!trimmedRelativePath) {
      setError('Relative path is required');
      return;
    }

    const sources = [
      uploadForm.file ? 'file' : null,
      trimmedArtifact ? 'artifact' : null,
      trimmedUpload ? 'upload' : null,
      trimmedFileUrl ? 'file_url' : null,
    ].filter(Boolean) as Array<'file' | 'artifact' | 'upload' | 'file_url'>;

    if (sources.length === 0) {
      setError('Provide a file (or artifact/upload/file_url)');
      return;
    }

    if (sources.length > 1) {
      setError('Provide only one source: file, artifact, upload, or file_url');
      return;
    }

    let pulpLabels: Record<string, string> | undefined;
    if (trimmedPulpLabels) {
      try {
        const parsed = JSON.parse(trimmedPulpLabels) as unknown;
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
        setError('Invalid pulp_labels JSON (must be an object of string values)');
        return;
      }
    }

    try {
      setUploading(true);
      const form = new FormData();

      // POST /content/file/files/ is asynchronous (returns a task)
      const endpoint = '/content/file/files/';

      if (pulpLabels && Object.keys(pulpLabels).length > 0) {
        form.append('pulp_labels', JSON.stringify(pulpLabels));
      }

      form.append('repository', trimmedRepository);
      form.append('relative_path', trimmedRelativePath);

      if (sources[0] === 'file') {
        form.append('file', uploadForm.file as File);
      } else if (sources[0] === 'artifact') {
        form.append('artifact', trimmedArtifact);
      } else if (sources[0] === 'upload') {
        form.append('upload', trimmedUpload);
      } else if (sources[0] === 'file_url') {
        form.append('file_url', trimmedFileUrl);
      }

      const resp = await apiService.post<{ task?: string }>(endpoint, form);
      setSuccessMessage(resp?.task ? 'File upload task started' : 'File upload request submitted');
      setError(null);
      setUploadOpen(false);
      await fetchData();
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to upload file'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (repo: Repository) => {
    setRepositoryToDelete(repo);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!repositoryToDelete) return;

    try {
      await apiService.delete(repositoryToDelete.pulp_href);
      setSuccessMessage('Repository delete task started');
      setDeleteConfirmOpen(false);
      setRepositoryToDelete(null);
      await fetchData();
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete repository'));
      setDeleteConfirmOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setRepositoryToDelete(null);
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
        <Typography variant="h4">File Repositories</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={openUpload}>
            Upload File
          </Button>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Create Repository
          </Button>
        </Box>
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
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Remote</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {repositories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No repositories found
                </TableCell>
              </TableRow>
            ) : (
              repositories.map((repo) => (
                <TableRow key={repo.pulp_href}>
                  <TableCell>{repo.name}</TableCell>
                  <TableCell>{(repo as any).description || ''}</TableCell>
                  <TableCell>
                    {(repo as any).remote ? (
                      <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {(repo as any).remote}
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/file/repository/view?href=${encodeURIComponent(repo.pulp_href)}`)}
                      aria-label="view"
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton color="primary" size="small" onClick={() => handleOpenDialog(repo)} aria-label="edit" title="Edit">
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDeleteClick(repo)} aria-label="delete" title="Delete">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={DEFAULT_PAGE_SIZE}
        rowsPerPageOptions={[DEFAULT_PAGE_SIZE]}
      />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRepository ? 'Edit Repository' : 'Create Repository'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
              disabled={!!editingRepository}
            />
            <TextField
              label="Description"
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            />
            <TextField
              select
              label="Remote"
              fullWidth
              value={formData.remote}
              onChange={(e) => setFormData((p) => ({ ...p, remote: e.target.value }))}
              helperText="Optional: associate a remote"
            >
              <MenuItem value="">None</MenuItem>
              {remotes.map((remote) => (
                <MenuItem key={remote.pulp_href} value={remote.pulp_href}>
                  {remote.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Retain File Versions"
              fullWidth
              type="number"
              value={formData.retain_repo_versions ?? ''}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  retain_repo_versions: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              error={formData.retain_repo_versions !== null && formData.retain_repo_versions <= 0}
              helperText={
                formData.retain_repo_versions !== null && formData.retain_repo_versions <= 0
                  ? 'Must be > 0'
                  : 'Number of file repository versions to retain (leave empty to retain all versions)'
              }
            />

            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.autopublish}
                    onChange={(e) => setFormData((p) => ({ ...p, autopublish: e.target.checked }))}
                  />
                }
                label="Auto-publish"
              />
              <FormHelperText>
                Whether to automatically create publications for new repository versions, and update any distributions pointing to this repository.
              </FormHelperText>
            </FormControl>

            <TextField
              label="Manifest"
              fullWidth
              value={formData.manifest}
              onChange={(e) => setFormData((p) => ({ ...p, manifest: e.target.value }))}
              helperText="Manifest file name (default: PULP_MANIFEST)"
            />

            <TextField
              label="pulp_labels (JSON)"
              fullWidth
              multiline
              minRows={3}
              value={pulpLabelsJson}
              onChange={(e) => setPulpLabelsJson(e.target.value)}
              error={!!pulpLabelsJsonError}
              helperText={pulpLabelsJsonError ?? 'Optional JSON object, e.g. {"env":"dev"}'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name}>
            {editingRepository ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={uploadOpen} onClose={closeUpload} maxWidth="sm" fullWidth>
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Repository"
              fullWidth
              value={uploadForm.repository}
              onChange={(e) => setUploadForm((p) => ({ ...p, repository: e.target.value }))}
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
              value={uploadForm.relative_path}
              onChange={(e) => setUploadForm((p) => ({ ...p, relative_path: e.target.value }))}
              required
              helperText="Path where the file will be located relative to the distribution base_path"
            />

            <Button variant="outlined" component="label">
              Choose File
              <input
                type="file"
                hidden
                onChange={(e) => setUploadForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
              />
            </Button>
            {uploadForm.file && (
              <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{uploadForm.file.name}</Box>
            )}

            <TextField
              label="Artifact (href)"
              fullWidth
              value={uploadForm.artifact}
              onChange={(e) => setUploadForm((p) => ({ ...p, artifact: e.target.value }))}
              helperText="Optional. Provide exactly one source: file, artifact, upload, or file_url."
            />
            <TextField
              label="Upload (href)"
              fullWidth
              value={uploadForm.upload}
              onChange={(e) => setUploadForm((p) => ({ ...p, upload: e.target.value }))}
              helperText="Optional. Provide exactly one source: file, artifact, upload, or file_url."
            />
            <TextField
              label="File URL"
              fullWidth
              value={uploadForm.file_url}
              onChange={(e) => setUploadForm((p) => ({ ...p, file_url: e.target.value }))}
              helperText="Optional. Provide exactly one source: file, artifact, upload, or file_url."
            />
            <TextField
              label="pulp_labels (JSON)"
              fullWidth
              value={uploadForm.pulp_labels}
              onChange={(e) => setUploadForm((p) => ({ ...p, pulp_labels: e.target.value }))}
              helperText='Optional JSON object, e.g. {"env":"dev"}'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUpload} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} variant="contained" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Repository</DialogTitle>
        <DialogContent>Are you sure you want to delete repository "{repositoryToDelete?.name}"?</DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};
