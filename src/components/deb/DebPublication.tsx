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
  MenuItem,
  Paper,
  Snackbar,
  TablePagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService, DEFAULT_PAGE_SIZE, formatPulpApiError, withPaginationParams } from '../../services/api';
import { debPublicationOrderingOptions } from '../../constants/orderingOptions';
import { Publication, PulpListResponse, Repository, RepositoryVersion } from '../../types/pulp';

interface PublicationFormData {
  repository_version: string;
  repository: string;
  simple: boolean;
  structured: boolean;
  checkpoint: boolean;
  signing_service: string;
  publish_upstream_release_fields: boolean;
}

const DebPublication: React.FC = () => {
  const navigate = useNavigate();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryVersions, setRepositoryVersions] = useState<RepositoryVersion[]>([]);
  const [repositoryMap, setRepositoryMap] = useState<Map<string, string>>(new Map());

  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [ordering, setOrdering] = useState<string>('');

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const [formData, setFormData] = useState<PublicationFormData>({
    repository_version: '',
    repository: '',
    simple: false,
    structured: true,
    checkpoint: false,
    signing_service: '',
    publish_upstream_release_fields: true,
  });

  useEffect(() => {
    void loadPublications(0);
    void loadRepositories();
  }, []);

  const loadPublications = async (pageToLoad = page) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await apiService.get<PulpListResponse<Publication>>(
        withPaginationParams('/publications/deb/apt/', { offset, ordering })
      );
      setPublications(response?.results || []);
      setTotalCount(response?.count ?? 0);
    } catch {
      setSnackbarMessage('Failed to load publications');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const loadRepositories = async () => {
    try {
      const response = await apiService.get<PulpListResponse<Repository>>(
        withPaginationParams('/repositories/deb/apt/', { offset: 0 })
      );
      const repos = response?.results || [];
      setRepositories(repos);
      const repoMap = new Map<string, string>();
      repos.forEach((repo) => repoMap.set(repo.pulp_href, repo.name));
      setRepositoryMap(repoMap);
    } catch {
      // optional
    }
  };

  const loadRepositoryVersions = async (repositoryHref: string) => {
    if (!repositoryHref) {
      setRepositoryVersions([]);
      return;
    }

    try {
      setVersionsLoading(true);
      const versionsEndpoint = repositoryHref.endsWith('/') ? `${repositoryHref}versions/` : `${repositoryHref}/versions/`;
      const response = await apiService.get<PulpListResponse<RepositoryVersion>>(versionsEndpoint);
      setRepositoryVersions(response?.results || []);
    } catch {
      setRepositoryVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setRepositoryVersions([]);
    setFormData({
      repository_version: '',
      repository: '',
      simple: false,
      structured: true,
      checkpoint: false,
      signing_service: '',
      publish_upstream_release_fields: true,
    });
    setOpenCreateDialog(true);
  };

  const handleDeleteClick = (publication: Publication) => {
    setSelectedPublication(publication);
    setOpenDeleteDialog(true);
  };

  const handleRepositoryChange = (repositoryHref: string) => {
    setFormData((prev) => ({
      ...prev,
      repository: repositoryHref,
      repository_version: '',
    }));
    setRepositoryVersions([]);
    if (repositoryHref) {
      void loadRepositoryVersions(repositoryHref);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload: any = {
        simple: formData.simple,
        structured: formData.structured,
        checkpoint: formData.checkpoint,
        publish_upstream_release_fields: formData.publish_upstream_release_fields,
      };

      if (formData.signing_service) payload.signing_service = formData.signing_service;
      if (formData.repository_version) payload.repository_version = formData.repository_version;
      else if (formData.repository) payload.repository = formData.repository;

      await apiService.post('/publications/deb/apt/', payload);
      setSnackbarMessage('Publication task started');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setOpenCreateDialog(false);
      setPage(0);
      await loadPublications(0);
    } catch (error) {
      setSnackbarMessage(formatPulpApiError(error, 'Failed to create publication'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedPublication) return;

    try {
      await apiService.delete(selectedPublication.pulp_href);
      setSnackbarMessage('Publication deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setOpenDeleteDialog(false);
      await loadPublications(page);
    } catch (error) {
      setSnackbarMessage(formatPulpApiError(error, 'Failed to delete publication'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    void loadPublications(newPage);
  };

  const handleOrderingChange = (newOrdering: string) => {
    setOrdering(newOrdering);
    setPage(0);
    void loadPublications(0);
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
        <Typography variant="h4">DEB Publications</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleCreateClick}>
          Create Publication
        </Button>
      </Box>

      <Box display="flex" justifyContent="flex-start" alignItems="center" mb={2}>
        <TextField
          select
          size="small"
          label="Order by"
          value={ordering}
          onChange={(e) => handleOrderingChange(e.target.value)}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="">Default</MenuItem>
          {debPublicationOrderingOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Repository</TableCell>
              <TableCell>Simple</TableCell>
              <TableCell>Structured</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {publications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No publications found
                </TableCell>
              </TableRow>
            ) : (
              publications.map((pub) => (
                <TableRow key={pub.pulp_href}>
                  <TableCell>{pub.repository ? repositoryMap.get(pub.repository) || 'N/A' : 'N/A'}</TableCell>
                  <TableCell>{(pub as any).simple ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{(pub as any).structured ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{pub.pulp_created ? new Date(pub.pulp_created).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/deb/publication/view?href=${encodeURIComponent(pub.pulp_href)}`)}
                      aria-label="view"
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDeleteClick(pub)} aria-label="delete" title="Delete">
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

      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Publication</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={repositories}
              getOptionLabel={(r) => r.name}
              value={repositories.find((r) => r.pulp_href === formData.repository) || null}
              onChange={(_, value) => handleRepositoryChange(value?.pulp_href || '')}
              renderInput={(params) => <TextField {...params} label="Repository" />}
            />

            <Autocomplete
              options={repositoryVersions}
              loading={versionsLoading}
              getOptionLabel={(v) => `#${v.number ?? '?'} - ${v.pulp_href}`}
              value={repositoryVersions.find((v) => v.pulp_href === formData.repository_version) || null}
              onChange={(_, value) => setFormData((p) => ({ ...p, repository_version: value?.pulp_href || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Repository Version"
                  helperText="Optional. If set, overrides repository."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {versionsLoading ? <CircularProgress color="inherit" size={20} /> : null}
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
              onChange={(e) => setFormData((p) => ({ ...p, signing_service: e.target.value }))}
            />

            <FormControlLabel
              control={<Checkbox checked={formData.simple} onChange={(e) => setFormData((p) => ({ ...p, simple: e.target.checked }))} />}
              label="Simple"
            />
            <FormControlLabel
              control={<Checkbox checked={formData.structured} onChange={(e) => setFormData((p) => ({ ...p, structured: e.target.checked }))} />}
              label="Structured"
            />
            <FormControlLabel
              control={<Checkbox checked={formData.checkpoint} onChange={(e) => setFormData((p) => ({ ...p, checkpoint: e.target.checked }))} />}
              label="Checkpoint"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.publish_upstream_release_fields}
                  onChange={(e) => setFormData((p) => ({ ...p, publish_upstream_release_fields: e.target.checked }))}
                />
              }
              label="Publish Upstream Release Fields"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this publication?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DebPublication;
