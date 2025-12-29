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
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { PulpListResponse, Remote, Repository } from '../../types/pulp';

interface RepositoryFormData {
  name: string;
  description: string;
  remote: string;
}

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

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRepository, setEditingRepository] = useState<Repository | null>(null);
  const [formData, setFormData] = useState<RepositoryFormData>({ name: '', description: '', remote: '' });

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [repoRes, remoteRes] = await Promise.all([
        apiService.get<PulpListResponse<Repository>>('/repositories/file/file/'),
        apiService.get<PulpListResponse<Remote>>('/remotes/file/file/'),
      ]);
      setRepositories(repoRes.results);
      setRemotes(remoteRes.results);
      setError(null);
    } catch {
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleOpenDialog = (repo?: Repository) => {
    if (repo) {
      setEditingRepository(repo);
      setFormData({
        name: repo.name,
        description: (repo as any).description || '',
        remote: (repo as any).remote || '',
      });
    } else {
      setEditingRepository(null);
      setFormData({ name: '', description: '', remote: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRepository(null);
  };

  const handleSubmit = async () => {
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        remote: formData.remote || null,
      };

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
    } catch {
      setError('Failed to upload file');
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
    } catch {
      setError('Failed to delete repository');
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

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
