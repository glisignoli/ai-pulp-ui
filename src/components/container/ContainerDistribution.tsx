import React, { useEffect, useMemo, useState } from 'react';
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
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Distribution, Repository } from '../../types/pulp';
import { containerService } from '../../services/container';
import { formatPulpApiError } from '../../services/api';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

interface DistributionFormData {
  name: string;
  base_path: string;
  content_guard: string;
  hidden: boolean;
  repository: string;
  repository_version: string;
  private: boolean;
  description: string;
}

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

export const ContainerDistribution: React.FC = () => {
  const navigate = useNavigate();

  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);

  const [loading, setLoading] = useState(true);
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
    repository_version: '',
    private: false,
    description: '',
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [distributionToDelete, setDistributionToDelete] = useState<Distribution | null>(null);

  const repositoryOptions = useMemo(
    () => repositories.map((r) => ({ label: r.name, value: r.pulp_href })),
    [repositories]
  );

  const fetchDistributions = async () => {
    try {
      setLoading(true);
      const response = await containerService.distributions.list();
      setDistributions(response.results);
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
      const response = await containerService.repositories.list();
      setRepositories(response.results);
    } catch {
      // optional
    } finally {
      setRepositoriesLoading(false);
    }
  };

  useEffect(() => {
    void fetchDistributions();
    void fetchRepositories();
  }, []);

  const handleOpenDialog = (dist?: Distribution) => {
    if (dist) {
      setEditingDistribution(dist);
      setFormData({
        name: dist.name,
        base_path: dist.base_path,
        content_guard: dist.content_guard || '',
        hidden: dist.hidden ?? false,
        repository: stripPulpOrigin(dist.repository || ''),
        repository_version: stripPulpOrigin((dist as any).repository_version || ''),
        private: (dist as any).private ?? false,
        description: (dist as any).description || '',
      });
    } else {
      setEditingDistribution(null);
      setFormData({
        name: '',
        base_path: '',
        content_guard: '',
        hidden: false,
        repository: '',
        repository_version: '',
        private: false,
        description: '',
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
        content_guard: formData.content_guard.trim() || null,
        hidden: formData.hidden,
        repository: formData.repository || null,
        repository_version: formData.repository_version || null,
        private: formData.private,
        description: formData.description.trim() || null,
      };

      // Pulp requires only one of repository or repository_version.
      if (payload.repository && payload.repository_version) {
        payload.repository_version = null;
      }

      if (editingDistribution) {
        await containerService.distributions.update(editingDistribution.pulp_href, payload);
        setSuccessMessage('Distribution updated successfully');
      } else {
        await containerService.distributions.create(payload);
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
      await containerService.distributions.delete(distributionToDelete.pulp_href);
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
        <Typography variant="h4">Container Distributions</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Distribution
        </Button>
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
                <TableCell>Private</TableCell>
                <TableCell>Hidden</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {distributions.map((dist) => (
                <TableRow key={dist.pulp_href}>
                  <TableCell>{dist.name}</TableCell>
                  <TableCell>{dist.base_path}</TableCell>
                  <TableCell>{dist.repository || (dist as any).repository_version || '-'}</TableCell>
                  <TableCell>{(dist as any).private ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{dist.hidden ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      title="View"
                      onClick={() =>
                        navigate(`/container/distribution/view?href=${encodeURIComponent(dist.pulp_href)}`)
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
          <TextField
            fullWidth
            margin="normal"
            label="Description"
            value={formData.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Content Guard (href)"
            value={formData.content_guard}
            onChange={(e) => handleFormChange('content_guard', e.target.value)}
          />
          <Autocomplete
            options={repositoryOptions}
            loading={repositoriesLoading}
            value={repositoryOptions.find((o) => o.value === formData.repository) || null}
            onChange={(_, value) => handleFormChange('repository', value?.value || '')}
            renderInput={(params) => <TextField {...params} label="Repository" margin="normal" />}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Repository Version (href)"
            value={formData.repository_version}
            onChange={(e) => handleFormChange('repository_version', e.target.value)}
            helperText="Optional; if set, repository will be cleared"
          />
          <FormControlLabel
            control={
              <Checkbox checked={formData.private} onChange={(e) => handleFormChange('private', e.target.checked)} />
            }
            label="Private"
          />
          <FormControlLabel
            control={
              <Checkbox checked={formData.hidden} onChange={(e) => handleFormChange('hidden', e.target.checked)} />
            }
            label="Hidden"
          />
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
