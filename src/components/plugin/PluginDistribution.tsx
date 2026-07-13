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
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Distribution, Publication, Remote, Repository } from '../../types/pulp';
import type { PluginConfig } from '../../constants/plugins';
import { pluginRoutePaths } from '../../constants/plugins';
import { createPluginService } from '../../services/pluginCrud';
import { DEFAULT_PAGE_SIZE, formatPulpApiError } from '../../services/api';
import { pluginDistributionOrderingOptions } from '../../constants/orderingOptions';
import { ForegroundSnackbar } from '../ForegroundSnackbar';
import { stripPulpOrigin } from '../../utils/pulp';

interface DistributionFormData {
  name: string;
  base_path: string;
  repository: string;
  publication: string;
  remote: string;
}

interface PluginDistributionProps {
  plugin: PluginConfig;
}

export const PluginDistribution: React.FC<PluginDistributionProps> = ({ plugin }) => {
  const navigate = useNavigate();
  const service = useMemo(() => createPluginService(plugin), [plugin]);
  const paths = useMemo(() => pluginRoutePaths(plugin), [plugin]);
  const hasPublications = !!service.publications;
  const hasPullThrough = plugin.hasPullThrough;

  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [remotes, setRemotes] = useState<Remote[]>([]);

  const [loading, setLoading] = useState(true);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [remotesLoading, setRemotesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [ordering, setOrdering] = useState<string>('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingDistribution, setEditingDistribution] = useState<Distribution | null>(null);
  const [formData, setFormData] = useState<DistributionFormData>({
    name: '',
    base_path: '',
    repository: '',
    publication: '',
    remote: '',
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [distributionToDelete, setDistributionToDelete] = useState<Distribution | null>(null);

  const repositoryOptions = useMemo(
    () => repositories.map((r) => ({ label: r.name, value: r.pulp_href })),
    [repositories]
  );

  const remoteOptions = useMemo(
    () => remotes.map((r) => ({ label: r.name, value: r.pulp_href })),
    [remotes]
  );

  const publicationOptions = useMemo(
    () =>
      publications.map((p) => ({
        label: `${p.pulp_created ? new Date(p.pulp_created).toLocaleString() : ''} ${p.pulp_href}`.trim(),
        value: p.pulp_href,
      })),
    [publications]
  );

  const fetchDistributions = async (pageToLoad = page) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await service.distributions.list(offset, ordering);
      setDistributions(response.results);
      setTotalCount(response.count);
      setError(null);
    } catch {
      setError('Failed to load distributions');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      setRepositoriesLoading(true);
      const response = await service.repositories.list(0);
      setRepositories(response.results);
    } catch {
      // optional
    } finally {
      setRepositoriesLoading(false);
    }
  };

  const fetchPublications = async () => {
    if (!service.publications) return;
    try {
      const response = await service.publications.list(0);
      setPublications(response.results);
    } catch {
      // optional
    }
  };

  const fetchRemotes = async () => {
    if (!hasPullThrough) return;
    try {
      setRemotesLoading(true);
      const response = await service.remotes.list(0);
      setRemotes(response.results);
    } catch {
      // optional
    } finally {
      setRemotesLoading(false);
    }
  };

  useEffect(() => {
    void fetchDistributions(0);
    void fetchRepositories();
    void fetchPublications();
    void fetchRemotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugin]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    void fetchDistributions(newPage);
  };

  const handleOrderingChange = (newOrdering: string) => {
    setOrdering(newOrdering);
    setPage(0);
    void fetchDistributions(0);
  };

  const handleOpenDialog = (dist?: Distribution) => {
    if (dist) {
      setEditingDistribution(dist);
      setFormData({
        name: dist.name,
        base_path: dist.base_path,
        repository: stripPulpOrigin(dist.repository || ''),
        publication: stripPulpOrigin(dist.publication || ''),
        remote: stripPulpOrigin(dist.remote || ''),
      });
    } else {
      setEditingDistribution(null);
      setFormData({
        name: '',
        base_path: '',
        repository: '',
        publication: '',
        remote: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDistribution(null);
  };

  const handleFormChange = (field: keyof DistributionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const payload: any = {
        name: formData.name,
        base_path: formData.base_path,
        repository: formData.repository || null,
      };

      if (hasPublications) {
        payload.publication = formData.publication || null;
        // Pulp accepts only one of repository or publication.
        if (payload.repository && payload.publication) {
          payload.repository = null;
        }
      }

      if (hasPullThrough) {
        payload.remote = formData.remote || null;
      }

      if (editingDistribution) {
        await service.distributions.update(editingDistribution.pulp_href, payload);
        setSuccessMessage('Distribution updated successfully');
      } else {
        await service.distributions.create(payload);
        setSuccessMessage('Distribution create task started');
      }

      handleCloseDialog();
      await fetchDistributions();
    } catch (error) {
      setError(
        formatPulpApiError(error, `Failed to ${editingDistribution ? 'update' : 'create'} distribution`)
      );
    }
  };

  const handleDeleteClick = (dist: Distribution) => {
    setDistributionToDelete(dist);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!distributionToDelete) return;

    try {
      await service.distributions.delete(distributionToDelete.pulp_href);
      setSuccessMessage('Distribution delete task started');
      setDeleteConfirmOpen(false);
      setDistributionToDelete(null);
      await fetchDistributions();
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete distribution'));
      setDeleteConfirmOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setDistributionToDelete(null);
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
        <Typography variant="h4">{plugin.label} Distributions</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Distribution
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
          {pluginDistributionOrderingOptions.map((opt) => (
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
                <TableCell>Name</TableCell>
                <TableCell>Base Path</TableCell>
                <TableCell>Repository</TableCell>
                {hasPublications ? <TableCell>Publication</TableCell> : null}
                {hasPullThrough ? <TableCell>Remote</TableCell> : null}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {distributions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4 + (hasPublications ? 1 : 0) + (hasPullThrough ? 1 : 0)} align="center">
                    No distributions found
                  </TableCell>
                </TableRow>
              ) : (
                distributions.map((dist) => (
                  <TableRow key={dist.pulp_href}>
                    <TableCell>{dist.name}</TableCell>
                    <TableCell>{dist.base_path}</TableCell>
                    <TableCell>
                      {dist.repository
                        ? repositories.find((r) => r.pulp_href === dist.repository)?.name || dist.repository
                        : '-'}
                    </TableCell>
                    {hasPublications ? <TableCell>{dist.publication || '-'}</TableCell> : null}
                    {hasPullThrough ? (
                      <TableCell>
                        {dist.remote
                          ? remotes.find((r) => r.pulp_href === dist.remote)?.name || dist.remote
                          : '-'}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <IconButton
                        color="primary"
                        title="View"
                        onClick={() =>
                          navigate(`${paths.distributionView}?href=${encodeURIComponent(dist.pulp_href)}`)
                        }
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton color="primary" title="Edit" onClick={() => handleOpenDialog(dist)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" title="Delete" onClick={() => handleDeleteClick(dist)}>
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingDistribution ? 'Edit Distribution' : 'Create Distribution'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Name"
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Base Path"
            value={formData.base_path}
            onChange={(e) => handleFormChange('base_path', e.target.value)}
            required
          />
          <Autocomplete
            options={repositoryOptions}
            loading={repositoriesLoading}
            value={repositoryOptions.find((o) => o.value === formData.repository) || null}
            onChange={(_, value) => handleFormChange('repository', value?.value || '')}
            renderInput={(params) => <TextField {...params} label="Repository" margin="normal" />}
          />
          {hasPublications ? (
            <Autocomplete
              options={publicationOptions}
              value={publicationOptions.find((o) => o.value === formData.publication) || null}
              onChange={(_, value) => handleFormChange('publication', value?.value || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Publication"
                  margin="normal"
                  helperText="Optional; if set, repository will be cleared"
                />
              )}
            />
          ) : null}
          {hasPullThrough ? (
            <Autocomplete
              options={remoteOptions}
              loading={remotesLoading}
              value={remoteOptions.find((o) => o.value === formData.remote) || null}
              onChange={(_, value) => handleFormChange('remote', value?.value || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Remote"
                  margin="normal"
                  helperText="Remote used to fetch content on demand (pull-through caching)"
                />
              )}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingDistribution ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete distribution "{distributionToDelete?.name}"?</Typography>
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
        message={successMessage}
      />
    </Container>
  );
};
