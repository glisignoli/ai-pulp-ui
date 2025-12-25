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
import { apiService } from '../../services/api';
import { PulpListResponse, Remote } from '../../types/pulp';

interface RemoteFormData {
  name: string;
  url: string;
  tls_validation: boolean;
  policy: 'immediate' | 'on_demand' | 'streamed';
  distributions: string;
  components: string;
  architectures: string;
  sync_sources: boolean;
  sync_udebs: boolean;
  sync_installer: boolean;
  gpgkey: string;
  ignore_missing_package_indices: boolean;
}

export const DebRemote: React.FC = () => {
  const navigate = useNavigate();

  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRemote, setEditingRemote] = useState<Remote | null>(null);
  const [formData, setFormData] = useState<RemoteFormData>({
    name: '',
    url: '',
    tls_validation: true,
    policy: 'immediate',
    distributions: '',
    components: '',
    architectures: '',
    sync_sources: false,
    sync_udebs: false,
    sync_installer: false,
    gpgkey: '',
    ignore_missing_package_indices: false,
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [remoteToDelete, setRemoteToDelete] = useState<Remote | null>(null);

  const fetchRemotes = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<Remote>>('/remotes/deb/apt/');
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
        tls_validation: (remote as any).tls_validation !== undefined ? (remote as any).tls_validation : true,
        policy: ((remote as any).policy as any) || 'immediate',
        distributions: (remote as any).distributions || '',
        components: (remote as any).components || '',
        architectures: (remote as any).architectures || '',
        sync_sources: (remote as any).sync_sources || false,
        sync_udebs: (remote as any).sync_udebs || false,
        sync_installer: (remote as any).sync_installer || false,
        gpgkey: (remote as any).gpgkey || '',
        ignore_missing_package_indices: (remote as any).ignore_missing_package_indices || false,
      });
    } else {
      setEditingRemote(null);
      setFormData({
        name: '',
        url: '',
        tls_validation: true,
        policy: 'immediate',
        distributions: '',
        components: '',
        architectures: '',
        sync_sources: false,
        sync_udebs: false,
        sync_installer: false,
        gpgkey: '',
        ignore_missing_package_indices: false,
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
        distributions: formData.distributions,
        sync_sources: formData.sync_sources,
        sync_udebs: formData.sync_udebs,
        sync_installer: formData.sync_installer,
        ignore_missing_package_indices: formData.ignore_missing_package_indices,
      };

      if (formData.components.trim()) payload.components = formData.components.trim();
      if (formData.architectures.trim()) payload.architectures = formData.architectures.trim();
      if (formData.gpgkey.trim()) payload.gpgkey = formData.gpgkey;

      if (editingRemote) {
        await apiService.put(editingRemote.pulp_href, payload);
        setSuccessMessage('Remote updated successfully');
      } else {
        await apiService.post('/remotes/deb/apt/', payload);
        setSuccessMessage('Remote created successfully');
      }

      handleCloseDialog();
      await fetchRemotes();
    } catch {
      setError(`Failed to ${editingRemote ? 'update' : 'create'} remote`);
    }
  };

  const handleDeleteClick = (remote: Remote) => {
    setRemoteToDelete(remote);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!remoteToDelete) return;

    try {
      await apiService.delete(remoteToDelete.pulp_href);
      setSuccessMessage('Remote delete task started');
      setDeleteConfirmOpen(false);
      setRemoteToDelete(null);
      await fetchRemotes();
    } catch {
      setError('Failed to delete remote');
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">DEB Remotes</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Remote
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
              <TableCell>URL</TableCell>
              <TableCell>Distributions</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {remotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No remotes found
                </TableCell>
              </TableRow>
            ) : (
              remotes.map((remote) => (
                <TableRow key={remote.pulp_href}>
                  <TableCell>{remote.name}</TableCell>
                  <TableCell>{remote.url}</TableCell>
                  <TableCell>{(remote as any).distributions || 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/deb/remote/view?href=${encodeURIComponent(remote.pulp_href)}`)}
                      aria-label="view"
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton color="primary" size="small" onClick={() => handleOpenDialog(remote)} aria-label="edit" title="Edit">
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDeleteClick(remote)} aria-label="delete" title="Delete">
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
        <DialogTitle>{editingRemote ? 'Edit Remote' : 'Create Remote'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Name" fullWidth value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} />
            <TextField label="URL" fullWidth value={formData.url} onChange={(e) => handleFormChange('url', e.target.value)} />
            <TextField
              label="Distributions"
              fullWidth
              value={formData.distributions}
              onChange={(e) => handleFormChange('distributions', e.target.value)}
              helperText="Required. Whitespace separated list (APT sources.list format)"
            />
            <TextField
              label="Components"
              fullWidth
              value={formData.components}
              onChange={(e) => handleFormChange('components', e.target.value)}
              helperText="Optional. Whitespace separated"
            />
            <TextField
              label="Architectures"
              fullWidth
              value={formData.architectures}
              onChange={(e) => handleFormChange('architectures', e.target.value)}
              helperText="Optional. Whitespace separated"
            />
            <TextField
              label="GPG Key"
              fullWidth
              multiline
              minRows={3}
              value={formData.gpgkey}
              onChange={(e) => handleFormChange('gpgkey', e.target.value)}
            />

            <FormControlLabel
              control={<Checkbox checked={formData.tls_validation} onChange={(e) => handleFormChange('tls_validation', e.target.checked)} />}
              label="TLS Validation"
            />
            <FormControlLabel
              control={<Checkbox checked={formData.sync_sources} onChange={(e) => handleFormChange('sync_sources', e.target.checked)} />}
              label="Sync Sources"
            />
            <FormControlLabel
              control={<Checkbox checked={formData.sync_udebs} onChange={(e) => handleFormChange('sync_udebs', e.target.checked)} />}
              label="Sync uDebs"
            />
            <FormControlLabel
              control={<Checkbox checked={formData.sync_installer} onChange={(e) => handleFormChange('sync_installer', e.target.checked)} />}
              label="Sync Installer Files"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.ignore_missing_package_indices}
                  onChange={(e) => handleFormChange('ignore_missing_package_indices', e.target.checked)}
                />
              }
              label="Ignore Missing Package Indices"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingRemote ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete remote "{remoteToDelete?.name}"?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
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
