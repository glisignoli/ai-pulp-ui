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
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService, formatPulpApiError } from '../../services/api';
import { Distribution, Publication, PulpListResponse, Repository } from '../../types/pulp';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

interface DistributionFormData {
  name: string;
  base_path: string;
  content_guard: string;
  hidden: boolean;
  repository: string;
  publication: string;
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

export const DebDistribution: React.FC = () => {
  const navigate = useNavigate();

  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);

  const [loading, setLoading] = useState(true);
  const [publicationsLoading, setPublicationsLoading] = useState(false);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingDistribution, setEditingDistribution] = useState<Distribution | null>(null);
  const [formData, setFormData] = useState<DistributionFormData>({
    name: '',
    base_path: '',
    content_guard: '',
    hidden: false,
    repository: '',
    publication: '',
    checkpoint: false,
  });

  const [pulpLabelsJson, setPulpLabelsJson] = useState('');
  const [pulpLabelsJsonError, setPulpLabelsJsonError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [distributionToDelete, setDistributionToDelete] = useState<Distribution | null>(null);

  const fetchDistributions = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<Distribution>>('/distributions/deb/apt/');
      setDistributions(response.results);
      setError(null);
    } catch {
      setError('Failed to load distributions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublications = async () => {
    try {
      setPublicationsLoading(true);
      const response = await apiService.get<PulpListResponse<Publication>>('/publications/deb/apt/');
      setPublications(response.results);
    } catch {
      // optional
    } finally {
      setPublicationsLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      setRepositoriesLoading(true);
      const response = await apiService.get<PulpListResponse<Repository>>('/repositories/deb/apt/');
      setRepositories(response.results);
    } catch {
      // optional
    } finally {
      setRepositoriesLoading(false);
    }
  };

  useEffect(() => {
    void fetchDistributions();
    void fetchPublications();
    void fetchRepositories();
  }, []);

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
      checkpoint: false,
    });
    setPulpLabelsJson('');
    setPulpLabelsJsonError(null);
  };

  const handleFormChange = (field: keyof DistributionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const { labels: pulpLabels, error: labelsError } = parsePulpLabelsJson(pulpLabelsJson);
      setPulpLabelsJsonError(labelsError);
      if (labelsError) return;

      const payload: any = {
        name: formData.name,
        base_path: formData.base_path,
        content_guard: formData.content_guard.trim() || null,
        hidden: formData.hidden,
        repository: formData.repository || null,
        publication: formData.publication || null,
        checkpoint: formData.checkpoint,
      };

      if (pulpLabels && Object.keys(pulpLabels).length > 0) {
        payload.pulp_labels = pulpLabels;
      }

      if (editingDistribution) {
        await apiService.put(editingDistribution.pulp_href, payload);
        setSuccessMessage('Distribution updated successfully');
      } else {
        await apiService.post('/distributions/deb/apt/', payload);
        setSuccessMessage('Distribution create task started');
      }

      handleCloseDialog();
      await fetchDistributions();
    } catch (error) {
      setError(formatPulpApiError(error, `Failed to ${editingDistribution ? 'update' : 'create'} distribution`));
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
        <Typography variant="h4">DEB Distributions</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Distribution
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
              <TableCell>Base Path</TableCell>
              <TableCell>Hidden</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {distributions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No distributions found
                </TableCell>
              </TableRow>
            ) : (
              distributions.map((dist) => (
                <TableRow key={dist.pulp_href}>
                  <TableCell>{dist.name}</TableCell>
                  <TableCell>{dist.base_path}</TableCell>
                  <TableCell>{dist.hidden ? 'Yes' : 'No'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/deb/distribution/view?href=${encodeURIComponent(dist.pulp_href)}`)}
                      aria-label="view"
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton color="primary" size="small" onClick={() => handleOpenDialog(dist)} aria-label="edit" title="Edit">
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDeleteClick(dist)} aria-label="delete" title="Delete">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingDistribution ? 'Edit Distribution' : 'Create Distribution'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Name" fullWidth value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} />
            <TextField
              label="Base Path"
              fullWidth
              value={formData.base_path}
              onChange={(e) => handleFormChange('base_path', e.target.value)}
            />
            <TextField
              label="Content Guard (href)"
              fullWidth
              value={formData.content_guard}
              onChange={(e) => handleFormChange('content_guard', e.target.value)}
            />

            <Autocomplete
              options={repositories}
              loading={repositoriesLoading}
              getOptionLabel={(r) => r.name}
              value={repositories.find((r) => r.pulp_href === formData.repository) || null}
              onChange={(_, value) => handleFormChange('repository', value?.pulp_href || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Repository"
                  helperText="Optional. Use to serve the latest version."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {repositoriesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <Autocomplete
              options={publications}
              loading={publicationsLoading}
              getOptionLabel={(p) => p.pulp_href}
              value={publications.find((p) => p.pulp_href === formData.publication) || null}
              onChange={(_, value) => handleFormChange('publication', value?.pulp_href || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Publication"
                  helperText="Optional. Use to serve a specific publication."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {publicationsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <FormControlLabel
              control={<Checkbox checked={formData.hidden} onChange={(e) => handleFormChange('hidden', e.target.checked)} />}
              label="Hidden"
            />
            <FormControlLabel
              control={<Checkbox checked={formData.checkpoint} onChange={(e) => handleFormChange('checkpoint', e.target.checked)} />}
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
          <Button onClick={handleSubmit} variant="contained">
            {editingDistribution ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete distribution "{distributionToDelete?.name}"?
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
