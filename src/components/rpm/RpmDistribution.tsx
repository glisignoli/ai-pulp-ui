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
  TablePagination,
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
  MenuItem,
  Snackbar,
  FormControlLabel,
  Checkbox,
  Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService, DEFAULT_PAGE_SIZE, formatPulpApiError, withPaginationParams } from '../../services/api';
import { rpmDistributionOrderingOptions } from '../../constants/orderingOptions';
import { Distribution, PulpListResponse, Publication, Repository } from '../../types/pulp';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

interface DistributionFormData {
  name: string;
  base_path: string;
  content_guard: string;
  hidden: boolean;
  repository: string;
  publication: string;
  generate_repo_config: boolean;
  checkpoint: boolean;
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

export const RpmDistribution: React.FC = () => {
  const navigate = useNavigate();
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [publicationsLoading, setPublicationsLoading] = useState(false);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [ordering, setOrdering] = useState<string>('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingDistribution, setEditingDistribution] = useState<Distribution | null>(null);
  const [formData, setFormData] = useState<DistributionFormData>({
    name: '',
    base_path: '',
    content_guard: '',
    hidden: false,
    repository: '',
    publication: '',
    generate_repo_config: false,
    checkpoint: false,
  });
  const [pulpLabelsJson, setPulpLabelsJson] = useState('');
  const [pulpLabelsJsonError, setPulpLabelsJsonError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [distributionToDelete, setDistributionToDelete] = useState<Distribution | null>(null);

  // Pulp may require fully-qualified hrefs (with scheme) in some write payloads.
  const stripPulpOrigin = (href: string) => {
    const trimmed = href.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        return parsed.pathname;
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  };

  const fetchDistributions = async (pageToLoad = page) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await apiService.get<PulpListResponse<Distribution>>(
        withPaginationParams('/distributions/rpm/rpm/', { offset, ordering })
      );
      setDistributions(response.results);
      setTotalCount(response.count);
      setError(null);
    } catch (err) {
      setError('Failed to load distributions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributions(0);
    fetchPublications();
    fetchRepositories();
  }, []);

  const fetchPublications = async () => {
    try {
      setPublicationsLoading(true);
      const response = await apiService.get<PulpListResponse<Publication>>(
        withPaginationParams('/publications/rpm/rpm/', { offset: 0 })
      );
      setPublications(response.results);
    } catch (err) {
      console.error('Failed to load publications:', err);
    } finally {
      setPublicationsLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      setRepositoriesLoading(true);
      const response = await apiService.get<PulpListResponse<Repository>>(
        withPaginationParams('/repositories/rpm/rpm/', { offset: 0 })
      );
      setRepositories(response.results);
    } catch (err) {
      console.error('Failed to load repositories:', err);
    } finally {
      setRepositoriesLoading(false);
    }
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    void fetchDistributions(newPage);
  };

  const handleOrderingChange = (newOrdering: string) => {
    setOrdering(newOrdering);
    setPage(0);
    void fetchDistributions(0);
  };



  const handleOpenDialog = (distribution?: Distribution) => {
    if (distribution) {
      setEditingDistribution(distribution);
      setFormData({
        name: distribution.name,
        base_path: distribution.base_path,
        content_guard: distribution.content_guard || '',
        hidden: distribution.hidden ?? false,
        repository: stripPulpOrigin(distribution.repository || ''),
        publication: stripPulpOrigin(distribution.publication || ''),
        generate_repo_config: distribution.generate_repo_config ?? false,
        checkpoint: distribution.checkpoint ?? false,
      });
      setPulpLabelsJson(distribution.pulp_labels ? JSON.stringify(distribution.pulp_labels, null, 2) : '');
    } else {
      setEditingDistribution(null);
      setFormData({
        name: '',
        base_path: '',
        content_guard: '',
        hidden: false,
        repository: '',
        publication: '',
        generate_repo_config: false,
        checkpoint: false,
      });
      setPulpLabelsJson('');
    }
    setPulpLabelsJsonError(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDistribution(null);
    setFormData({
      name: '',
      base_path: '',
      content_guard: '',
      hidden: false,
      repository: '',
      publication: '',
      generate_repo_config: false,
      checkpoint: false,
    });
    setPulpLabelsJson('');
    setPulpLabelsJsonError(null);
  };

  const handleFormChange = (field: keyof DistributionFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const { labels: pulpLabels, error: labelsError } = parsePulpLabelsJson(pulpLabelsJson);
      setPulpLabelsJsonError(labelsError);
      if (labelsError) return;

      const payload: any = {
        name: formData.name,
        base_path: formData.base_path,
        hidden: formData.hidden,
        generate_repo_config: formData.generate_repo_config,
        checkpoint: formData.checkpoint,
        content_guard: formData.content_guard.trim() || null,
        repository: formData.repository || null,
        publication: formData.publication || null,
      };

      if (pulpLabels && Object.keys(pulpLabels).length > 0) {
        payload.pulp_labels = pulpLabels;
      }

      if (editingDistribution) {
        await apiService.put(`${editingDistribution.pulp_href}`, payload);
        setSuccessMessage('Distribution updated successfully');
      } else {
        await apiService.post('/distributions/rpm/rpm/', payload);
        setSuccessMessage('Distribution created successfully');
      }

      handleCloseDialog();
      fetchDistributions();
    } catch (err) {
      setError(
        formatPulpApiError(err, `Failed to ${editingDistribution ? 'update' : 'create'} distribution`)
      );
    }
  };

  const handleDeleteClick = (distribution: Distribution) => {
    setDistributionToDelete(distribution);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!distributionToDelete) return;

    try {
      await apiService.delete(distributionToDelete.pulp_href);
      setSuccessMessage('Distribution deleted successfully');
      setDeleteConfirmOpen(false);
      setDistributionToDelete(null);
      fetchDistributions();
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to delete distribution'));
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
        <Typography variant="h4">
          RPM Distributions
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
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
          {rpmDistributionOrderingOptions.map((opt) => (
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Base Path</TableCell>
              <TableCell>Hidden</TableCell>
              <TableCell>Repository</TableCell>
              <TableCell>Publication</TableCell>
              <TableCell>Content Guard</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {distributions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No distributions found
                </TableCell>
              </TableRow>
            ) : (
              distributions.map((dist) => (
                <TableRow key={dist.pulp_href}>
                  <TableCell>{dist.name}</TableCell>
                  <TableCell>{dist.base_path}</TableCell>
                  <TableCell>{dist.hidden ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{dist.repository || 'None'}</TableCell>
                  <TableCell>{dist.publication || 'None'}</TableCell>
                  <TableCell>{dist.content_guard || 'None'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() =>
                        navigate(`/rpm/distribution/view?href=${encodeURIComponent(dist.pulp_href)}`)
                      }
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(dist)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(dist)}
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

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={DEFAULT_PAGE_SIZE}
        rowsPerPageOptions={[DEFAULT_PAGE_SIZE]}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingDistribution ? 'Edit Distribution' : 'Create Distribution'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              disabled={!!editingDistribution}
              helperText="A unique name"
            />

            <TextField
              label="Base Path"
              fullWidth
              required
              value={formData.base_path}
              onChange={(e) => handleFormChange('base_path', e.target.value)}
              helperText="Base (relative) path component of the published URL"
            />

            <Autocomplete
              options={publications}
              getOptionLabel={(option) => {
                const repoName = option.repository ? option.repository.split('/').filter(Boolean).pop() : 'Unknown';
                const created = option.pulp_created ? new Date(option.pulp_created).toLocaleDateString() : '';
                return `${repoName} (${created})`;
              }}
              value={publications.find(p => p.pulp_href === formData.publication) || null}
              onChange={(_, newValue) => handleFormChange('publication', newValue?.pulp_href || '')}
              loading={publicationsLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Publication"
                  helperText="Optional. Select a publication to serve"
                />
              )}
            />

            <Autocomplete
              options={repositories}
              getOptionLabel={(option) => option.name}
              value={repositories.find((r) => r.pulp_href === formData.repository) || null}
              onChange={(_, newValue) => handleFormChange('repository', newValue?.pulp_href || '')}
              loading={repositoriesLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Repository"
                  helperText="Optional. Distribution will serve the latest version of the repository"
                />
              )}
            />

            <TextField
              label="Content Guard HREF"
              fullWidth
              value={formData.content_guard}
              onChange={(e) => handleFormChange('content_guard', e.target.value)}
              helperText="Optional. Content guard HREF"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.hidden}
                  onChange={(e) => handleFormChange('hidden', e.target.checked)}
                />
              }
              label="Hidden"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.generate_repo_config}
                  onChange={(e) => handleFormChange('generate_repo_config', e.target.checked)}
                />
              }
              label="Generate Repo Config"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.checkpoint}
                  onChange={(e) => handleFormChange('checkpoint', e.target.checked)}
                />
              }
              label="Checkpoint"
            />

            <TextField
              label="Pulp Labels (JSON)"
              fullWidth
              multiline
              minRows={3}
              value={pulpLabelsJson}
              onChange={(e) => {
                setPulpLabelsJson(e.target.value);
                setPulpLabelsJsonError(null);
              }}
              error={!!pulpLabelsJsonError}
              helperText={pulpLabelsJsonError ?? 'Optional. JSON object of string values'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={!formData.name.trim() || !formData.base_path.trim()}
          >
            {editingDistribution ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the distribution "{distributionToDelete?.name}"?
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
