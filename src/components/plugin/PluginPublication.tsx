import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Publication, Repository, RepositoryVersion } from '../../types/pulp';
import type { PluginConfig } from '../../constants/plugins';
import { pluginRoutePaths } from '../../constants/plugins';
import { createPluginService } from '../../services/pluginCrud';
import { DEFAULT_PAGE_SIZE, formatPulpApiError } from '../../services/api';
import { pluginPublicationOrderingOptions } from '../../constants/orderingOptions';
import { ForegroundSnackbar } from '../ForegroundSnackbar';
import { PluginFieldInputs, buildFieldPayload, initialFieldValues, type PluginFieldValues } from './pluginFields';

interface PublicationFormData {
  repository: string;
  repository_version: string;
}

interface PluginPublicationProps {
  plugin: PluginConfig;
}

export const PluginPublication: React.FC<PluginPublicationProps> = ({ plugin }) => {
  const navigate = useNavigate();
  const service = useMemo(() => createPluginService(plugin), [plugin]);
  const paths = useMemo(() => pluginRoutePaths(plugin), [plugin]);

  const [publications, setPublications] = useState<Publication[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryVersions, setRepositoryVersions] = useState<RepositoryVersion[]>([]);

  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [ordering, setOrdering] = useState<string>('');

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [publicationToDelete, setPublicationToDelete] = useState<Publication | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<PublicationFormData>({
    repository: '',
    repository_version: '',
  });
  const [extraValues, setExtraValues] = useState<PluginFieldValues>(
    initialFieldValues(plugin.publicationFields)
  );

  const repositoryMap = useMemo(() => {
    const map = new Map<string, string>();
    repositories.forEach((repo) => map.set(repo.pulp_href, repo.name));
    return map;
  }, [repositories]);

  const fetchPublications = async (pageToLoad = page, orderingParam = ordering) => {
    if (!service.publications) return;

    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await service.publications.list(offset, orderingParam);
      setPublications(response.results);
      setTotalCount(response.count);
      setError(null);
    } catch {
      setError('Failed to load publications');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      const response = await service.repositories.list(0);
      setRepositories(response.results);
    } catch {
      // optional
    }
  };

  const fetchRepositoryVersions = async (repositoryHref: string) => {
    if (!repositoryHref) {
      setRepositoryVersions([]);
      return;
    }

    try {
      setVersionsLoading(true);
      const versionsEndpoint = repositoryHref.endsWith('/')
        ? `${repositoryHref}versions/`
        : `${repositoryHref}/versions/`;
      const response = await service.repositories.versions(versionsEndpoint);
      setRepositoryVersions(response.results);
    } catch {
      setRepositoryVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPublications(0);
    void fetchRepositories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugin]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    void fetchPublications(newPage);
  };

  const handleOrderingChange = (newOrdering: string) => {
    setOrdering(newOrdering);
    setPage(0);
    void fetchPublications(0, newOrdering);
  };

  const handleCreateClick = () => {
    setRepositoryVersions([]);
    setFormData({ repository: '', repository_version: '' });
    setExtraValues(initialFieldValues(plugin.publicationFields));
    setOpenCreateDialog(true);
  };

  const handleRepositoryChange = (repositoryHref: string) => {
    setFormData({ repository: repositoryHref, repository_version: '' });
    setRepositoryVersions([]);
    if (repositoryHref) {
      void fetchRepositoryVersions(repositoryHref);
    }
  };

  const handleSubmit = async () => {
    if (!service.publications) return;

    try {
      const { payload: extraPayload, error: extraError } = buildFieldPayload(
        plugin.publicationFields,
        extraValues
      );
      if (extraError) {
        setError(extraError);
        return;
      }

      const payload: any = { ...extraPayload };
      if (formData.repository_version) payload.repository_version = formData.repository_version;
      else if (formData.repository) payload.repository = formData.repository;

      await service.publications.create(payload);
      setSuccessMessage('Publication task started');
      setOpenCreateDialog(false);
      setPage(0);
      await fetchPublications(0);
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to create publication'));
    }
  };

  const handleDeleteClick = (publication: Publication) => {
    setPublicationToDelete(publication);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!publicationToDelete || !service.publications) return;

    try {
      await service.publications.delete(publicationToDelete.pulp_href);
      setSuccessMessage('Publication deleted successfully');
      setDeleteConfirmOpen(false);
      setPublicationToDelete(null);
      await fetchPublications();
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
        <Typography variant="h4">{plugin.label} Publications</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateClick}>
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
          {pluginPublicationOrderingOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <ForegroundSnackbar
        open={!!error}
        message={error ?? ''}
        severity="error"
        onClose={() => setError(null)}
      />

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Repository</TableCell>
                <TableCell>Repository Version</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {publications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No publications found
                  </TableCell>
                </TableRow>
              ) : (
                publications.map((pub) => (
                  <TableRow key={pub.pulp_href}>
                    <TableCell>
                      {pub.repository ? repositoryMap.get(pub.repository) || pub.repository : '-'}
                    </TableCell>
                    <TableCell>{pub.repository_version || '-'}</TableCell>
                    <TableCell>{pub.pulp_created ? new Date(pub.pulp_created).toLocaleString() : '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        title="View"
                        onClick={() =>
                          navigate(`${paths.publicationView}?href=${encodeURIComponent(pub.pulp_href)}`)
                        }
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton color="error" title="Delete" onClick={() => handleDeleteClick(pub)}>
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
      </Paper>

      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
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
                />
              )}
            />

            <PluginFieldInputs
              fields={plugin.publicationFields}
              values={extraValues}
              onChange={(key, value) => setExtraValues((prev) => ({ ...prev, [key]: value }))}
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

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this publication?</DialogContent>
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
        message={successMessage}
      />
    </Container>
  );
};
