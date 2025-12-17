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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { apiService } from '../../services/api';
import { Distribution, PulpListResponse } from '../../types/pulp';

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

export const RpmDistribution: React.FC = () => {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
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
    generate_repo_config: false,
    checkpoint: false,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [distributionToDelete, setDistributionToDelete] = useState<Distribution | null>(null);

  const fetchDistributions = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<Distribution>>('/distributions/rpm/rpm/');
      setDistributions(response.results);
      setError(null);
    } catch (err) {
      setError('Failed to load distributions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributions();
  }, []);

  const handleOpenDialog = (distribution?: Distribution) => {
    if (distribution) {
      setEditingDistribution(distribution);
      setFormData({
        name: distribution.name,
        base_path: distribution.base_path,
        content_guard: distribution.content_guard || '',
        hidden: distribution.hidden ?? false,
        repository: distribution.repository || '',
        publication: distribution.publication || '',
        generate_repo_config: distribution.generate_repo_config ?? false,
        checkpoint: distribution.checkpoint ?? false,
      });
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
    }
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
  };

  const handleFormChange = (field: keyof DistributionFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload: any = {
        name: formData.name,
        base_path: formData.base_path,
        hidden: formData.hidden,
        generate_repo_config: formData.generate_repo_config,
        checkpoint: formData.checkpoint,
        content_guard: formData.content_guard.trim() ? formData.content_guard.trim() : null,
        repository: formData.repository.trim() ? formData.repository.trim() : null,
        publication: formData.publication.trim() ? formData.publication.trim() : null,
      };

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
      setError(`Failed to ${editingDistribution ? 'update' : 'create'} distribution`);
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
      setError('Failed to delete distribution');
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

            <TextField
              label="Repository HREF"
              fullWidth
              value={formData.repository}
              onChange={(e) => handleFormChange('repository', e.target.value)}
              helperText="Optional. Repository HREF to serve (e.g. /pulp/api/v3/repositories/rpm/rpm/...)"
            />

            <TextField
              label="Publication HREF"
              fullWidth
              value={formData.publication}
              onChange={(e) => handleFormChange('publication', e.target.value)}
              helperText="Optional. Publication HREF to serve (e.g. /pulp/api/v3/publications/rpm/rpm/...)"
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
