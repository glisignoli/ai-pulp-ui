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
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Remote } from '../../types/pulp';
import { containerService } from '../../services/container';
import { formatPulpApiError } from '../../services/api';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

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

export const ContainerRemote: React.FC = () => {
  const navigate = useNavigate();

  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRemote, setEditingRemote] = useState<Remote | null>(null);
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

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [remoteToDelete, setRemoteToDelete] = useState<Remote | null>(null);

  const fetchRemotes = async () => {
    try {
      setLoading(true);
      const response = await containerService.remotes.list();
      setRemotes(response.results);
      setError(null);
    } catch {
      setError('Failed to load remotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRemotes();
  }, []);

  const handleOpenDialog = (remote?: Remote) => {
    if (remote) {
      setEditingRemote(remote);
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
    } else {
      setEditingRemote(null);
      setFormData({
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
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRemote(null);
  };

  const handleFormChange = (field: keyof RemoteFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
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

      if (editingRemote) {
        await containerService.remotes.update(editingRemote.pulp_href, payload);
        setSuccessMessage('Remote updated successfully');
      } else {
        await containerService.remotes.create(payload);
        setSuccessMessage('Remote created successfully');
      }

      handleCloseDialog();
      await fetchRemotes();
    } catch (error) {
      setError(formatPulpApiError(error, `Failed to ${editingRemote ? 'update' : 'create'} remote`));
    }
  };

  const handleDeleteClick = (remote: Remote) => {
    setRemoteToDelete(remote);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!remoteToDelete) return;

    try {
      await containerService.remotes.delete(remoteToDelete.pulp_href);
      setSuccessMessage('Remote delete task started');
      setDeleteConfirmOpen(false);
      setRemoteToDelete(null);
      await fetchRemotes();
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete remote'));
      setDeleteConfirmOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setRemoteToDelete(null);
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
        <Typography variant="h4">Container Remotes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Remote
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
                <TableCell>URL</TableCell>
                <TableCell>Upstream</TableCell>
                <TableCell>Policy</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {remotes.map((remote) => (
                <TableRow key={remote.pulp_href}>
                  <TableCell>{remote.name}</TableCell>
                  <TableCell>{remote.url}</TableCell>
                  <TableCell>{(remote as any).upstream_name || '-'}</TableCell>
                  <TableCell>{(remote.policy as any) || 'immediate'}</TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      title="View"
                      onClick={() =>
                        navigate(`/container/remote/view?href=${encodeURIComponent(remote.pulp_href)}`)
                      }
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton color="primary" title="Edit" onClick={() => handleOpenDialog(remote)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" title="Delete" onClick={() => handleDeleteClick(remote)}>
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
        <DialogTitle>{editingRemote ? 'Edit Remote' : 'Create Remote'}</DialogTitle>
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
            label="URL"
            value={formData.url}
            onChange={(e) => handleFormChange('url', e.target.value)}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Upstream Name"
            value={formData.upstream_name}
            onChange={(e) => handleFormChange('upstream_name', e.target.value)}
            required
          />
          <TextField
            select
            fullWidth
            margin="normal"
            label="Policy"
            value={formData.policy}
            onChange={(e) => handleFormChange('policy', e.target.value)}
          >
            <MenuItem value="immediate">immediate</MenuItem>
            <MenuItem value="on_demand">on_demand</MenuItem>
            <MenuItem value="streamed">streamed</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.tls_validation}
                onChange={(e) => handleFormChange('tls_validation', e.target.checked)}
              />
            }
            label="TLS Validation"
          />
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            value={formData.username}
            onChange={(e) => handleFormChange('username', e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => handleFormChange('password', e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Include Tags (comma or newline separated)"
            multiline
            minRows={2}
            value={formData.include_tags}
            onChange={(e) => handleFormChange('include_tags', e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Exclude Tags (comma or newline separated)"
            multiline
            minRows={2}
            value={formData.exclude_tags}
            onChange={(e) => handleFormChange('exclude_tags', e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Sigstore (URL)"
            value={formData.sigstore}
            onChange={(e) => handleFormChange('sigstore', e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingRemote ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete remote "{remoteToDelete?.name}"?</Typography>
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
