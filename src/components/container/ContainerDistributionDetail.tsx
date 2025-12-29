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
  TextField,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Distribution, Repository } from '../../types/pulp';
import { containerService } from '../../services/container';
import { formatPulpApiError } from '../../services/api';

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

export const ContainerDistributionDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const href = searchParams.get('href') || '';

  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);

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

  const repositoryOptions = useMemo(
    () => repositories.map((r) => ({ label: r.name, value: r.pulp_href })),
    [repositories]
  );

  const fetchDistribution = async () => {
    if (!href) {
      setError('Missing distribution href');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await containerService.distributions.read(href);
      setDistribution(data);
      setError(null);
    } catch {
      setError('Failed to load distribution');
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
    void fetchDistribution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  const openEdit = async () => {
    if (!distribution) return;

    setFormData({
      name: distribution.name,
      base_path: distribution.base_path,
      content_guard: distribution.content_guard || '',
      hidden: distribution.hidden ?? false,
      repository: stripPulpOrigin(distribution.repository || ''),
      repository_version: stripPulpOrigin((distribution as any).repository_version || ''),
      private: (distribution as any).private ?? false,
      description: (distribution as any).description || '',
    });
    setEditOpen(true);
    await fetchRepositories();
  };

  const submitEdit = async () => {
    if (!distribution) return;

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

      if (payload.repository && payload.repository_version) {
        payload.repository_version = null;
      }

      await containerService.distributions.update(distribution.pulp_href, payload);
      setSuccessMessage('Distribution updated successfully');
      setEditOpen(false);
      await fetchDistribution();
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to update distribution'));
    }
  };

  const performDelete = async () => {
    if (!distribution) return;

    try {
      await containerService.distributions.delete(distribution.pulp_href);
      navigate('/container/distribution');
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete distribution'));
      setDeleteConfirmOpen(false);
    }
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

  if (!distribution) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error || 'Distribution not found'}</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/container/distribution')}>
          Back to Distributions
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Container Distribution</Typography>
        <Box display="flex" gap={1} alignItems="center">
          <Button variant="outlined" onClick={() => navigate('/container/distribution')}>
            Back
          </Button>
          <IconButton color="primary" onClick={openEdit} title="Edit">
            <EditIcon />
          </IconButton>
          <IconButton color="error" onClick={() => setDeleteConfirmOpen(true)} title="Delete">
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          GET Result
        </Typography>
        <Box component="pre" sx={{ m: 0, overflowX: 'auto' }}>
          {JSON.stringify(distribution, null, 2)}
        </Box>
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Distribution</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Base Path"
            value={formData.base_path}
            onChange={(e) => setFormData((p) => ({ ...p, base_path: e.target.value }))}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Content Guard (href)"
            value={formData.content_guard}
            onChange={(e) => setFormData((p) => ({ ...p, content_guard: e.target.value }))}
          />
          <Autocomplete
            options={repositoryOptions}
            loading={repositoriesLoading}
            value={repositoryOptions.find((o) => o.value === formData.repository) || null}
            onChange={(_, value) => setFormData((p) => ({ ...p, repository: value?.value || '' }))}
            renderInput={(params) => <TextField {...params} label="Repository" margin="normal" />}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Repository Version (href)"
            value={formData.repository_version}
            onChange={(e) => setFormData((p) => ({ ...p, repository_version: e.target.value }))}
            helperText="Optional; if set, repository will be cleared"
          />
          <FormControlLabel
            control={
              <Checkbox checked={formData.private} onChange={(e) => setFormData((p) => ({ ...p, private: e.target.checked }))} />
            }
            label="Private"
          />
          <FormControlLabel
            control={
              <Checkbox checked={formData.hidden} onChange={(e) => setFormData((p) => ({ ...p, hidden: e.target.checked }))} />
            }
            label="Hidden"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={submitEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete distribution "{distribution.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={performDelete} color="error" variant="contained">
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
