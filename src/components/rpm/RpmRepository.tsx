import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  MenuItem,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Checkbox,
  Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService, formatPulpApiError } from '../../services/api';
import { Repository, Remote, PulpListResponse } from '../../types/pulp';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

interface RepositoryFormData {
  name: string;
  description: string;
  retain_repo_versions: number | null;
  autopublish: boolean;
  retain_package_versions: number | null;
  checksum_type: string;
  repo_config: string;
  metadata_signing_service: string;
  package_signing_service: string;
  package_signing_fingerprint: string;
  compression_type: string;
  layout: string;
  remote: string;
}

export const RpmRepository: React.FC = () => {
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [loading, setLoading] = useState(true);
  const [remotesLoading, setRemotesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null);
  const [formData, setFormData] = useState<RepositoryFormData>({
    name: '',
    description: '',
    retain_repo_versions: null,
    autopublish: false,
    retain_package_versions: null,
    checksum_type: '',
    repo_config: '',
    metadata_signing_service: '',
    package_signing_service: '',
    package_signing_fingerprint: '',
    compression_type: '',
    layout: '',
    remote: '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<Repository | null>(null);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<Repository>>(
        '/repositories/rpm/rpm/'
      );
      setRepositories(response.results);
      setError(null);
    } catch (err) {
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const fetchRemotes = async () => {
    try {
      setRemotesLoading(true);
      const response = await apiService.get<PulpListResponse<Remote>>(
        '/remotes/rpm/rpm/'
      );
      setRemotes(response.results);
    } catch (err) {
      console.error('Failed to load remotes:', err);
    } finally {
      setRemotesLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
    fetchRemotes();
  }, []);

  const handleOpenDialog = (repo?: Repository) => {
    if (repo) {
      setEditingRepo(repo);
      setFormData({
        name: repo.name,
        description: repo.description || '',
        retain_repo_versions: repo.retain_repo_versions ?? null,
        autopublish: repo.autopublish || false,
        retain_package_versions: repo.retain_package_versions ?? null,
        checksum_type: repo.checksum_type || '',
        repo_config: repo.repo_config ? JSON.stringify(repo.repo_config, null, 2) : '',
        metadata_signing_service: repo.metadata_signing_service || '',
        package_signing_service: repo.package_signing_service || '',
        package_signing_fingerprint: repo.package_signing_fingerprint || '',
        compression_type: repo.compression_type || '',
        layout: repo.layout || '',
        remote: repo.remote || '',
      });
    } else {
      setEditingRepo(null);
      setFormData({
        name: '',
        description: '',
        retain_repo_versions: null,
        autopublish: false,
        retain_package_versions: null,
        checksum_type: '',
        repo_config: '',
        metadata_signing_service: '',
        package_signing_service: '',
        package_signing_fingerprint: '',
        compression_type: '',
        layout: '',
        remote: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRepo(null);
    setFormData({
      name: '',
      description: '',
      retain_repo_versions: null,
      autopublish: false,
      retain_package_versions: null,
      checksum_type: '',
      repo_config: '',
      metadata_signing_service: '',
      package_signing_service: '',
      package_signing_fingerprint: '',
      compression_type: '',
      layout: '',
      remote: '',
    });
  };

  const handleFormChange = (field: keyof RepositoryFormData, value: RepositoryFormData[keyof RepositoryFormData]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const retainRepoVersionsInvalid = formData.retain_repo_versions !== null && formData.retain_repo_versions < 0;
      const retainPackageVersionsInvalid =
        formData.retain_package_versions !== null && formData.retain_package_versions < 0;

      if (retainRepoVersionsInvalid) {
        setError('Retain Repository Versions must be >= 0');
        return;
      }
      if (retainPackageVersionsInvalid) {
        setError('Retain Package Versions must be >= 0');
        return;
      }

      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        retain_repo_versions: formData.retain_repo_versions ?? undefined,
        autopublish: formData.autopublish,
        retain_package_versions: formData.retain_package_versions ?? undefined,
      };

      if (formData.repo_config.trim()) {
        try {
          payload.repo_config = JSON.parse(formData.repo_config);
        } catch {
          setError('Invalid JSON in repo_config');
          return;
        }
      }

      // Only include optional fields if they have values
      if (formData.remote) payload.remote = formData.remote;
      if (formData.checksum_type) payload.checksum_type = formData.checksum_type;
      if (formData.metadata_signing_service) payload.metadata_signing_service = formData.metadata_signing_service;
      if (formData.package_signing_service) payload.package_signing_service = formData.package_signing_service;
      if (formData.package_signing_fingerprint) payload.package_signing_fingerprint = formData.package_signing_fingerprint;
      if (formData.compression_type) payload.compression_type = formData.compression_type;
      if (formData.layout) payload.layout = formData.layout;

      if (editingRepo) {
        // Update existing repository
        await apiService.put(`${editingRepo.pulp_href}`, payload);
        setSuccessMessage('Repository updated successfully');
      } else {
        // Create new repository
        await apiService.post('/repositories/rpm/rpm/', payload);
        setSuccessMessage('Repository created successfully');
      }

      handleCloseDialog();
      fetchRepositories();
    } catch (err) {
      setError(formatPulpApiError(err, `Failed to ${editingRepo ? 'update' : 'create'} repository`));
    }
  };

  const handleDeleteClick = (repo: Repository) => {
    setRepoToDelete(repo);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!repoToDelete) return;

    try {
      await apiService.delete(repoToDelete.pulp_href);
      setSuccessMessage('Repository deleted successfully');
      setDeleteConfirmOpen(false);
      setRepoToDelete(null);
      fetchRepositories();
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to delete repository'));
      setDeleteConfirmOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setRepoToDelete(null);
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
        <Typography variant="h4">
          RPM Repositories
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Repository
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
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Retain Versions</TableCell>
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
                  <TableCell>{repo.description || 'N/A'}</TableCell>
                  <TableCell>{repo.retain_repo_versions ?? 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() =>
                        navigate(`/rpm/repository/view?href=${encodeURIComponent(repo.pulp_href)}`)
                      }
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(repo)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(repo)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRepo ? 'Edit Repository' : 'Create Repository'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              disabled={!!editingRepo} // Name cannot be changed when editing
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />
            <Autocomplete
              options={remotes}
              getOptionLabel={(option) => option.name}
              value={remotes.find(r => r.pulp_href === formData.remote) || null}
              onChange={(_, newValue) => handleFormChange('remote', newValue?.pulp_href || '')}
              loading={remotesLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Remote"
                  helperText="Optional: Select a remote repository to sync content from"
                />
              )}
            />
            <TextField
              label="Retain Repository Versions"
              fullWidth
              type="number"
              value={formData.retain_repo_versions ?? ''}
              onChange={(e) => handleFormChange('retain_repo_versions', e.target.value ? parseInt(e.target.value) : null)}
              error={formData.retain_repo_versions !== null && formData.retain_repo_versions < 0}
              helperText={
                formData.retain_repo_versions !== null && formData.retain_repo_versions < 0
                  ? 'Must be >= 0'
                  : 'Number of repository versions to retain (leave empty to retain all versions)'
              }
            />
            <TextField
              label="Retain Package Versions"
              fullWidth
              type="number"
              value={formData.retain_package_versions ?? ''}
              onChange={(e) => handleFormChange('retain_package_versions', e.target.value ? parseInt(e.target.value) : null)}
              error={formData.retain_package_versions !== null && formData.retain_package_versions < 0}
              helperText={
                formData.retain_package_versions !== null && formData.retain_package_versions < 0
                  ? 'Must be >= 0'
                  : 'Number of versions of each package to keep (0 = keep all)'
              }
            />
            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.autopublish}
                    onChange={(e) => handleFormChange('autopublish', e.target.checked)}
                  />
                }
                label="Auto-publish"
              />
              <FormHelperText>Automatically create publications for new repository versions</FormHelperText>
            </FormControl>
            <TextField
              label="Checksum Type"
              fullWidth
              select
              value={formData.checksum_type}
              onChange={(e) => handleFormChange('checksum_type', e.target.value)}
              helperText="Preferred checksum type during repo publish"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="unknown">Unknown</MenuItem>
              <MenuItem value="md5">MD5</MenuItem>
              <MenuItem value="sha1">SHA1</MenuItem>
              <MenuItem value="sha224">SHA224</MenuItem>
              <MenuItem value="sha256">SHA256</MenuItem>
              <MenuItem value="sha384">SHA384</MenuItem>
              <MenuItem value="sha512">SHA512</MenuItem>
            </TextField>
            <TextField
              label="Repo Config (JSON)"
              fullWidth
              multiline
              rows={4}
              value={formData.repo_config}
              onChange={(e) => handleFormChange('repo_config', e.target.value)}
              helperText="Optional: Repository configuration as a JSON document"
            />
            <TextField
              label="Compression Type"
              fullWidth
              select
              value={formData.compression_type}
              onChange={(e) => handleFormChange('compression_type', e.target.value)}
              helperText="Compression type for metadata files"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="zstd">ZSTD</MenuItem>
              <MenuItem value="gz">GZIP</MenuItem>
            </TextField>
            <TextField
              label="Layout"
              fullWidth
              select
              value={formData.layout}
              onChange={(e) => handleFormChange('layout', e.target.value)}
              helperText="Package layout within published repository"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="nested_alphabetically">Nested Alphabetically</MenuItem>
              <MenuItem value="flat">Flat</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={!formData.name.trim()}
          >
            {editingRepo ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the repository "{repoToDelete?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Container>
  );
};
