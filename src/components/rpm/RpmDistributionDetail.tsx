import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  TextField,
  Typography,
  Autocomplete,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService, formatPulpApiError } from '../../services/api';
import { toExposedBackendUrl } from '../../services/exposedBackend';
import { PulpListResponse, Publication, Repository, Distribution } from '../../types/pulp';

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

export const RpmDistributionDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const href = searchParams.get('href') || '';

  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [publications, setPublications] = useState<Publication[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [publicationsLoading, setPublicationsLoading] = useState(false);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);

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

  const fetchDistribution = async () => {
    if (!href) {
      setError('Missing distribution href');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const dist = await apiService.get<Distribution>(href);
      setDistribution(dist);
      setError(null);
    } catch (err) {
      setError('Failed to load distribution');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublications = async () => {
    try {
      setPublicationsLoading(true);
      const response = await apiService.get<PulpListResponse<Publication>>('/publications/rpm/rpm/');
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
      const response = await apiService.get<PulpListResponse<Repository>>('/repositories/rpm/rpm/');
      setRepositories(response.results);
    } catch (err) {
      console.error('Failed to load repositories:', err);
    } finally {
      setRepositoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribution();
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
      publication: stripPulpOrigin(distribution.publication || ''),
      generate_repo_config: distribution.generate_repo_config ?? false,
      checkpoint: distribution.checkpoint ?? false,
    });
    setPulpLabelsJson(distribution.pulp_labels ? JSON.stringify(distribution.pulp_labels, null, 2) : '');
    setPulpLabelsJsonError(null);
    setEditOpen(true);
    await fetchPublications();
    await fetchRepositories();
  };

  const closeEdit = () => {
    setEditOpen(false);
  };

  const handleFormChange = (field: keyof DistributionFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitEdit = async () => {
    if (!distribution) return;

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
      };

      if (formData.content_guard) payload.content_guard = formData.content_guard;
      if (formData.repository) payload.repository = formData.repository;
      if (formData.publication) payload.publication = formData.publication;

      if (pulpLabels && Object.keys(pulpLabels).length > 0) {
        payload.pulp_labels = pulpLabels;
      }

      await apiService.put(distribution.pulp_href, payload);
      setSuccessMessage('Distribution updated successfully');
      setEditOpen(false);
      await fetchDistribution();
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to update distribution'));
    }
  };

  const confirmDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
  };

  const executeDelete = async () => {
    if (!distribution) return;

    try {
      await apiService.delete(distribution.pulp_href);
      setSuccessMessage('Distribution deleted successfully');
      setDeleteConfirmOpen(false);
      setTimeout(() => {
        navigate('/rpm/distribution');
      }, 1500);
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to delete distribution'));
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

  if (error && !distribution) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/rpm/distribution')}>
          Back to Distributions
        </Button>
      </Container>
    );
  }

  if (!distribution) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          Distribution not found
        </Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/rpm/distribution')}>
          Back to Distributions
        </Button>
      </Container>
    );
  }

  const exposedBaseUrl = toExposedBackendUrl(distribution.base_url ?? null);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Distribution: {distribution.name}</Typography>
        <Box>
          <Button variant="outlined" sx={{ mr: 1 }} onClick={() => navigate('/rpm/distribution')}>
            Back
          </Button>
          {exposedBaseUrl && (
            <Button
              variant="outlined"
              sx={{ mr: 1 }}
              component="a"
              href={exposedBaseUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </Button>
          )}
          <Button variant="contained" color="primary" sx={{ mr: 1 }} onClick={openEdit}>
            <EditIcon sx={{ mr: 1 }} /> Edit
          </Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            <DeleteIcon sx={{ mr: 1 }} /> Delete
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          GET Result
        </Typography>
        <Box
          component="pre"
          sx={{
            m: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'monospace',
            fontSize: 13,
          }}
        >
          {JSON.stringify(distribution, null, 2)}
        </Box>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Distribution</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
            />
            <TextField
              label="Base Path"
              fullWidth
              required
              value={formData.base_path}
              onChange={(e) => handleFormChange('base_path', e.target.value)}
            />
            <TextField
              label="Content Guard"
              fullWidth
              value={formData.content_guard}
              onChange={(e) => handleFormChange('content_guard', e.target.value)}
              helperText="Optional: URL to a content guard"
            />
            <Autocomplete
              options={repositories}
              getOptionLabel={(option) => option.name}
              value={repositories.find((r) => stripPulpOrigin(r.pulp_href) === formData.repository) || null}
              onChange={(_, newValue) =>
                handleFormChange('repository', newValue ? stripPulpOrigin(newValue.pulp_href) : '')
              }
              loading={repositoriesLoading}
              renderInput={(params) => (
                <TextField {...params} label="Repository" helperText="Optional: Link to repository" />
              )}
            />
            <Autocomplete
              options={publications}
              getOptionLabel={(option) => option.pulp_href}
              value={publications.find((p) => stripPulpOrigin(p.pulp_href) === formData.publication) || null}
              onChange={(_, newValue) =>
                handleFormChange('publication', newValue ? stripPulpOrigin(newValue.pulp_href) : '')
              }
              loading={publicationsLoading}
              renderInput={(params) => (
                <TextField {...params} label="Publication" helperText="Optional: Link to publication" />
              )}
            />
            <FormControlLabel
              control={
                <Checkbox checked={formData.hidden} onChange={(e) => handleFormChange('hidden', e.target.checked)} />
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
          <Button onClick={closeEdit}>Cancel</Button>
          <Button onClick={submitEdit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={cancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the distribution "{distribution.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancel</Button>
          <Button onClick={executeDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Container>
  );
};
