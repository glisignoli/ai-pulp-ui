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
import { Add as AddIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService, DEFAULT_PAGE_SIZE, formatPulpApiError, withPaginationParams } from '../../services/api';
import { PulpListResponse, Publication, Repository, RepositoryVersion } from '../../types/pulp';

interface PublicationFormData {
  repository: string;
  repository_version: string;
  manifest: string;
  checkpoint: boolean;
}

export const FilePublication: React.FC = () => {
  const navigate = useNavigate();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryVersions, setRepositoryVersions] = useState<RepositoryVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<PublicationFormData>({
    repository: '',
    repository_version: '',
    manifest: 'PULP_MANIFEST',
    checkpoint: false,
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [publicationToDelete, setPublicationToDelete] = useState<Publication | null>(null);

  const fetchData = async (pageToLoad: number = page) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const [pubRes, repoRes] = await Promise.all([
        apiService.get<PulpListResponse<Publication>>(withPaginationParams('/publications/file/file/', { offset })),
        apiService.get<PulpListResponse<Repository>>(withPaginationParams('/repositories/file/file/', { offset: 0 })),
      ]);

      setPublications(pubRes.results);
      setRepositories(repoRes.results);
      setTotalCount(pubRes.count);
      setPage(pageToLoad);
      setError(null);
    } catch {
      setError('Failed to load publications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(0);
  }, []);

  const handlePageChange = (_event: unknown, newPage: number) => {
    void fetchData(newPage);
  };

  const loadRepositoryVersions = async (repositoryHref: string) => {
    if (!repositoryHref) {
      setRepositoryVersions([]);
      return;
    }

    try {
      setVersionsLoading(true);
      const versionsEndpoint = repositoryHref.endsWith('/')
        ? `${repositoryHref}versions/`
        : `${repositoryHref}/versions/`;
      const response = await apiService.get<PulpListResponse<RepositoryVersion>>(
        withPaginationParams(versionsEndpoint, { offset: 0 })
      );
      setRepositoryVersions(response?.results || []);
    } catch {
      setRepositoryVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setRepositoryVersions([]);
    setFormData({
      repository: '',
      repository_version: '',
      manifest: 'PULP_MANIFEST',
      checkpoint: false,
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => setOpenDialog(false);

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
        checkpoint: formData.checkpoint,
      };

      if (formData.repository_version) {
        payload.repository_version = formData.repository_version;
      } else {
        payload.repository = formData.repository;
      }

      const trimmedManifest = formData.manifest.trim();
      if (trimmedManifest) {
        payload.manifest = trimmedManifest;
      }

      await apiService.post('/publications/file/file/', payload);
      setSuccessMessage('Publication creation task started');
      handleCloseDialog();
      await fetchData(0);
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to create publication'));
    }
  };

  const handleDeleteClick = (publication: Publication) => {
    setPublicationToDelete(publication);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!publicationToDelete) return;

    try {
      await apiService.delete(publicationToDelete.pulp_href);
      setSuccessMessage('Publication delete task started');
      setDeleteConfirmOpen(false);
      setPublicationToDelete(null);
      const nextPage = publications.length === 1 && page > 0 ? page - 1 : page;
      await fetchData(nextPage);
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete publication'));
      setDeleteConfirmOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setPublicationToDelete(null);
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
        <Typography variant="h4">File Publications</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          Create Publication
        </Button>
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
              <TableCell>Href</TableCell>
              <TableCell>Repository</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {publications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No publications found
                </TableCell>
              </TableRow>
            ) : (
              publications.map((publication) => (
                <TableRow key={publication.pulp_href}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{publication.pulp_href}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{publication.repository}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/file/publication/view?href=${encodeURIComponent(publication.pulp_href)}`)}
                      aria-label="view"
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDeleteClick(publication)} aria-label="delete" title="Delete">
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
        <DialogTitle>Create Publication</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Repository"
              fullWidth
              value={formData.repository}
              onChange={(e) => handleRepositoryChange(e.target.value)}
              required
              helperText="Select the repository to publish"
            >
              {repositories.map((repo) => (
                <MenuItem key={repo.pulp_href} value={repo.pulp_href}>
                  {repo.name}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              options={repositoryVersions}
              getOptionLabel={(option) => `Version ${option.number ?? 'N/A'}`}
              value={repositoryVersions.find((v) => v.pulp_href === formData.repository_version) || null}
              onChange={(_, newValue) =>
                setFormData((prev) => ({ ...prev, repository_version: newValue?.pulp_href || '' }))
              }
              loading={versionsLoading}
              disabled={!formData.repository}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  label="Repository Version (optional)"
                  helperText="If not provided, the latest version will be used"
                />
              )}
            />

            <TextField
              label="Manifest"
              fullWidth
              value={formData.manifest}
              onChange={(e) => setFormData((prev) => ({ ...prev, manifest: e.target.value }))}
              helperText="Manifest file name (default: PULP_MANIFEST)"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.checkpoint}
                  onChange={(e) => setFormData((prev) => ({ ...prev, checkpoint: e.target.checked }))}
                />
              }
              label="Checkpoint"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.repository}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Publication</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this publication?
          <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 1, fontSize: '0.8rem' }}>
            {publicationToDelete?.pulp_href}
          </Box>
        </DialogContent>
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
