import React, { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService, DEFAULT_PAGE_SIZE, formatPulpApiError, withPaginationParams } from '../../services/api';
import { PulpListResponse, Remote, Repository } from '../../types/pulp';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

const parseStringRecordJson = (jsonText: string, fieldNameForErrors: string) => {
  if (!jsonText.trim()) {
    return { value: undefined as Record<string, string> | undefined, error: '' };
  }

  try {
    const parsed = JSON.parse(jsonText);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: undefined, error: `Invalid ${fieldNameForErrors} JSON` };
    }

    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        return { value: undefined, error: `Invalid ${fieldNameForErrors} JSON` };
      }
      record[key] = value;
    }

    return { value: record, error: '' };
  } catch {
    return { value: undefined, error: `Invalid ${fieldNameForErrors} JSON` };
  }
};

interface RepositoryFormData {
  name: string;
  description: string;
  retain_repo_versions: number | null;
  retain_package_versions: number | null;
  autopublish: boolean;
  publish_upstream_release_fields: boolean;
  signing_service: string;
  remote: string;
}

export const DebRepository: React.FC = () => {
  const navigate = useNavigate();

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [loading, setLoading] = useState(true);
  const [remotesLoading, setRemotesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null);
  const [formData, setFormData] = useState<RepositoryFormData>({
    name: '',
    description: '',
    retain_repo_versions: null,
    retain_package_versions: null,
    autopublish: false,
    publish_upstream_release_fields: true,
    signing_service: '',
    remote: '',
  });

  const [pulpLabelsJson, setPulpLabelsJson] = useState('');
  const [pulpLabelsJsonError, setPulpLabelsJsonError] = useState('');
  const [signingServiceReleaseOverridesJson, setSigningServiceReleaseOverridesJson] = useState('');
  const [signingServiceReleaseOverridesJsonError, setSigningServiceReleaseOverridesJsonError] = useState('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<Repository | null>(null);

  const fetchRepositories = async (pageToLoad: number = page) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await apiService.get<PulpListResponse<Repository>>(
        withPaginationParams('/repositories/deb/apt/', { offset })
      );
      setRepositories(response.results);
      setTotalCount(response.count);
      setPage(pageToLoad);
      setError(null);
    } catch {
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const fetchRemotes = async () => {
    try {
      setRemotesLoading(true);
      const response = await apiService.get<PulpListResponse<Remote>>(
        withPaginationParams('/remotes/deb/apt/', { offset: 0 })
      );
      setRemotes(response.results);
    } catch {
      // optional
    } finally {
      setRemotesLoading(false);
    }
  };

  useEffect(() => {
    void fetchRepositories(0);
    void fetchRemotes();
  }, []);

  const handlePageChange = (_event: unknown, newPage: number) => {
    void fetchRepositories(newPage);
  };

  const handleOpenDialog = (repo?: Repository) => {
    if (repo) {
      setEditingRepo(repo);
      setFormData({
        name: repo.name,
        description: repo.description || '',
        retain_repo_versions: repo.retain_repo_versions ?? null,
        retain_package_versions: repo.retain_package_versions ?? null,
        autopublish: repo.autopublish ?? false,
        publish_upstream_release_fields: (repo as any).publish_upstream_release_fields ?? true,
        signing_service: (repo as any).signing_service || '',
        remote: repo.remote || '',
      });

      setPulpLabelsJson(repo.pulp_labels ? JSON.stringify(repo.pulp_labels, null, 2) : '');
      setPulpLabelsJsonError('');
      setSigningServiceReleaseOverridesJson(
        (repo as any).signing_service_release_overrides
          ? JSON.stringify((repo as any).signing_service_release_overrides, null, 2)
          : ''
      );
      setSigningServiceReleaseOverridesJsonError('');
    } else {
      setEditingRepo(null);
      setFormData({
        name: '',
        description: '',
        retain_repo_versions: null,
        retain_package_versions: null,
        autopublish: false,
        publish_upstream_release_fields: true,
        signing_service: '',
        remote: '',
      });

      setPulpLabelsJson('');
      setPulpLabelsJsonError('');
      setSigningServiceReleaseOverridesJson('');
      setSigningServiceReleaseOverridesJsonError('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRepo(null);
    setPulpLabelsJson('');
    setPulpLabelsJsonError('');
    setSigningServiceReleaseOverridesJson('');
    setSigningServiceReleaseOverridesJsonError('');
  };

  const handleFormChange = (field: keyof RepositoryFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (formData.retain_package_versions !== null && formData.retain_package_versions <= 0) {
        setError('Retain Package Versions must be null or > 0');
        return;
      }

      const parsedPulpLabels = parseStringRecordJson(pulpLabelsJson, 'pulp_labels');
      if (parsedPulpLabels.error) {
        setPulpLabelsJsonError(parsedPulpLabels.error);
        return;
      }
      setPulpLabelsJsonError('');

      const parsedSigningServiceReleaseOverrides = parseStringRecordJson(
        signingServiceReleaseOverridesJson,
        'signing_service_release_overrides'
      );
      if (parsedSigningServiceReleaseOverrides.error) {
        setSigningServiceReleaseOverridesJsonError(parsedSigningServiceReleaseOverrides.error);
        return;
      }
      setSigningServiceReleaseOverridesJsonError('');

      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        retain_repo_versions: formData.retain_repo_versions ?? undefined,
        retain_package_versions: formData.retain_package_versions ?? undefined,
        autopublish: formData.autopublish,
        publish_upstream_release_fields: formData.publish_upstream_release_fields,
      };

      if (parsedPulpLabels.value && Object.keys(parsedPulpLabels.value).length > 0) {
        payload.pulp_labels = parsedPulpLabels.value;
      }
      if (parsedSigningServiceReleaseOverrides.value && Object.keys(parsedSigningServiceReleaseOverrides.value).length > 0) {
        payload.signing_service_release_overrides = parsedSigningServiceReleaseOverrides.value;
      }

      if (formData.remote) payload.remote = formData.remote;
      if (formData.signing_service) payload.signing_service = formData.signing_service;

      if (editingRepo) {
        await apiService.put(editingRepo.pulp_href, payload);
        setSuccessMessage('Repository updated successfully');
      } else {
        await apiService.post('/repositories/deb/apt/', payload);
        setSuccessMessage('Repository created successfully');
      }

      handleCloseDialog();
      await fetchRepositories(editingRepo ? page : 0);
    } catch (error) {
      setError(formatPulpApiError(error, `Failed to ${editingRepo ? 'update' : 'create'} repository`));
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
      const nextPage = repositories.length === 1 && page > 0 ? page - 1 : page;
      await fetchRepositories(nextPage);
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete repository'));
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
        <Typography variant="h4">DEB Repositories</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
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
                  <TableCell>{repo.retain_repo_versions ?? 'All'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/deb/repository/view?href=${encodeURIComponent(repo.pulp_href)}`)}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingRepo ? 'Edit Repository' : 'Create Repository'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Name" fullWidth value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} />
            <TextField
              label="Description"
              fullWidth
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />
            <TextField
              label="Retain Repo Versions"
              type="number"
              fullWidth
              value={formData.retain_repo_versions ?? ''}
              onChange={(e) => handleFormChange('retain_repo_versions', e.target.value ? Number(e.target.value) : null)}
              helperText="Leave blank to retain all"
            />

            <TextField
              label="Retain Package Versions"
              type="number"
              fullWidth
              value={formData.retain_package_versions ?? ''}
              onChange={(e) => handleFormChange('retain_package_versions', e.target.value ? Number(e.target.value) : null)}
              helperText="Leave blank to retain all"
            />

            <Autocomplete
              options={remotes}
              loading={remotesLoading}
              getOptionLabel={(r) => r.name}
              value={remotes.find((r) => r.pulp_href === formData.remote) || null}
              onChange={(_, value) => handleFormChange('remote', value?.pulp_href || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Remote"
                  helperText="Optional default remote for sync"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {remotesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <TextField
              label="Signing Service (href)"
              fullWidth
              value={formData.signing_service}
              onChange={(e) => handleFormChange('signing_service', e.target.value)}
            />

            <FormControlLabel
              control={<Checkbox checked={formData.autopublish} onChange={(e) => handleFormChange('autopublish', e.target.checked)} />}
              label="Autopublish"
            />

            <TextField
              label="Pulp Labels (JSON)"
              fullWidth
              multiline
              minRows={3}
              value={pulpLabelsJson}
              onChange={(e) => {
                setPulpLabelsJson(e.target.value);
                setPulpLabelsJsonError('');
              }}
              error={!!pulpLabelsJsonError}
              helperText={pulpLabelsJsonError || 'Optional key/value labels for this repository'}
            />

            <TextField
              label="Signing Service Release Overrides (JSON)"
              fullWidth
              multiline
              minRows={3}
              value={signingServiceReleaseOverridesJson}
              onChange={(e) => {
                setSigningServiceReleaseOverridesJson(e.target.value);
                setSigningServiceReleaseOverridesJsonError('');
              }}
              error={!!signingServiceReleaseOverridesJsonError}
              helperText={
                signingServiceReleaseOverridesJsonError ||
                'A dictionary of Release distributions and the Signing Service URLs they should use.Example: {"bionic": "/pulp/api/v3/signing-services/433a1f70-c589-4413-a803-c50b842ea9b5/"}'
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.publish_upstream_release_fields}
                  onChange={(e) => handleFormChange('publish_upstream_release_fields', e.target.checked)}
                />
              }
              label="Publish Upstream Release Fields"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingRepo ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete repository "{repoToDelete?.name}"?</DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
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
