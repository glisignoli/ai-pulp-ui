import React, { useEffect, useState } from 'react';
import {
  Alert,
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
  TextField,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Remote } from '../../types/pulp';
import { containerService } from '../../services/container';
import { formatPulpApiError } from '../../services/api';

interface RemoteFormData {
  name: string;
  url: string;
  upstream_name: string;
  tls_validation: boolean;
  policy: 'immediate' | 'on_demand' | 'streamed';
  username: string;
  password: string;
  include_tags: string;
  exclude_tags: string;
  sigstore: string;
}

const splitTags = (value: string): string[] | null => {
  const trimmed = value
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return trimmed.length ? trimmed : null;
};

export const ContainerRemoteDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const href = searchParams.get('href') || '';

  const [remote, setRemote] = useState<Remote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [formData, setFormData] = useState<RemoteFormData>({
    name: '',
    url: '',
    upstream_name: '',
    tls_validation: true,
    policy: 'immediate',
    username: '',
    password: '',
    include_tags: '',
    exclude_tags: '',
    sigstore: '',
  });

  const fetchRemote = async () => {
    if (!href) {
      setError('Missing remote href');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await containerService.remotes.read(href);
      setRemote(data);
      setError(null);
    } catch {
      setError('Failed to load remote');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRemote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  const openEdit = () => {
    if (!remote) return;

    setFormData({
      name: remote.name,
      url: remote.url,
      upstream_name: (remote as any).upstream_name || '',
      tls_validation: remote.tls_validation !== undefined ? !!remote.tls_validation : true,
      policy: (remote.policy as any) || 'immediate',
      username: '',
      password: '',
      include_tags: Array.isArray((remote as any).include_tags) ? (remote as any).include_tags.join('\n') : '',
      exclude_tags: Array.isArray((remote as any).exclude_tags) ? (remote as any).exclude_tags.join('\n') : '',
      sigstore: (remote as any).sigstore || '',
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!remote) return;

    try {
      const payload: any = {
        name: formData.name,
        url: formData.url,
        tls_validation: formData.tls_validation,
        policy: formData.policy,
        upstream_name: formData.upstream_name,
      };

      if (formData.username) payload.username = formData.username;
      if (formData.password) payload.password = formData.password;

      const includeTags = splitTags(formData.include_tags);
      const excludeTags = splitTags(formData.exclude_tags);
      if (includeTags) payload.include_tags = includeTags;
      if (excludeTags) payload.exclude_tags = excludeTags;
      if (formData.sigstore) payload.sigstore = formData.sigstore;

      await containerService.remotes.update(remote.pulp_href, payload);
      setSuccessMessage('Remote updated successfully');
      setEditOpen(false);
      await fetchRemote();
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to update remote'));
    }
  };

  const performDelete = async () => {
    if (!remote) return;

    try {
      await containerService.remotes.delete(remote.pulp_href);
      navigate('/container/remote');
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete remote'));
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

  if (!remote) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error || 'Remote not found'}</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/container/remote')}>
          Back to Remotes
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Container Remote</Typography>
        <Box display="flex" gap={1} alignItems="center">
          <Button variant="outlined" onClick={() => navigate('/container/remote')}>
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
          {JSON.stringify(remote, null, 2)}
        </Box>
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Remote</DialogTitle>
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
            label="URL"
            value={formData.url}
            onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Upstream Name"
            value={formData.upstream_name}
            onChange={(e) => setFormData((p) => ({ ...p, upstream_name: e.target.value }))}
            required
          />
          <TextField
            select
            fullWidth
            margin="normal"
            label="Policy"
            value={formData.policy}
            onChange={(e) => setFormData((p) => ({ ...p, policy: e.target.value as any }))}
          >
            <MenuItem value="immediate">immediate</MenuItem>
            <MenuItem value="on_demand">on_demand</MenuItem>
            <MenuItem value="streamed">streamed</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.tls_validation}
                onChange={(e) => setFormData((p) => ({ ...p, tls_validation: e.target.checked }))}
              />
            }
            label="TLS Validation"
          />
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Include Tags (comma or newline separated)"
            multiline
            minRows={2}
            value={formData.include_tags}
            onChange={(e) => setFormData((p) => ({ ...p, include_tags: e.target.value }))}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Exclude Tags (comma or newline separated)"
            multiline
            minRows={2}
            value={formData.exclude_tags}
            onChange={(e) => setFormData((p) => ({ ...p, exclude_tags: e.target.value }))}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Sigstore (URL)"
            value={formData.sigstore}
            onChange={(e) => setFormData((p) => ({ ...p, sigstore: e.target.value }))}
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
          <Typography>Are you sure you want to delete remote "{remote.name}"?</Typography>
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
