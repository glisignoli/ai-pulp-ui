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
  MenuItem,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Checkbox,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { apiService } from '../../services/api';
import { Remote, PulpListResponse } from '../../types/pulp';

interface RemoteFormData {
  name: string;
  url: string;
  ca_cert: string;
  client_cert: string;
  client_key: string;
  tls_validation: boolean;
  proxy_url: string;
  proxy_username: string;
  proxy_password: string;
  username: string;
  password: string;
  pulp_labels: { [key: string]: string };
  download_concurrency: number | null;
  max_retries: number | null;
  policy: string;
  total_timeout: number | null;
  connect_timeout: number | null;
  sock_connect_timeout: number | null;
  sock_read_timeout: number | null;
  headers: Array<{ name: string; value: string }>;
  rate_limit: number | null;
  sles_auth_token: string;
}

export const RpmRemote: React.FC = () => {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRemote, setEditingRemote] = useState<Remote | null>(null);
  const [formData, setFormData] = useState<RemoteFormData>({
    name: '',
    url: '',
    ca_cert: '',
    client_cert: '',
    client_key: '',
    tls_validation: true,
    proxy_url: '',
    proxy_username: '',
    proxy_password: '',
    username: '',
    password: '',
    pulp_labels: {},
    download_concurrency: null,
    max_retries: null,
    policy: 'immediate',
    total_timeout: null,
    connect_timeout: null,
    sock_connect_timeout: null,
    sock_read_timeout: null,
    headers: [],
    rate_limit: null,
    sles_auth_token: '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [remoteToDelete, setRemoteToDelete] = useState<Remote | null>(null);

  const fetchRemotes = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<Remote>>(
        '/remotes/rpm/rpm/'
      );
      setRemotes(response.results);
      setError(null);
    } catch (err) {
      setError('Failed to load remotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRemotes();
  }, []);

  const handleOpenDialog = (remote?: Remote) => {
    if (remote) {
      setEditingRemote(remote);
      setFormData({
        name: remote.name,
        url: remote.url,
        ca_cert: remote.ca_cert || '',
        client_cert: remote.client_cert || '',
        client_key: '',
        tls_validation: remote.tls_validation !== undefined ? remote.tls_validation : true,
        proxy_url: remote.proxy_url || '',
        proxy_username: '',
        proxy_password: '',
        username: '',
        password: '',
        pulp_labels: remote.pulp_labels || {},
        download_concurrency: remote.download_concurrency || null,
        max_retries: remote.max_retries || null,
        policy: remote.policy || 'immediate',
        total_timeout: remote.total_timeout || null,
        connect_timeout: remote.connect_timeout || null,
        sock_connect_timeout: remote.sock_connect_timeout || null,
        sock_read_timeout: remote.sock_read_timeout || null,
        headers: remote.headers ? remote.headers.map(h => ({ name: Object.keys(h)[0] || '', value: Object.values(h)[0] as string || '' })) : [],
        rate_limit: remote.rate_limit || null,
        sles_auth_token: remote.sles_auth_token || '',
      });
    } else {
      setEditingRemote(null);
      setFormData({
        name: '',
        url: '',
        ca_cert: '',
        client_cert: '',
        client_key: '',
        tls_validation: true,
        proxy_url: '',
        proxy_username: '',
        proxy_password: '',
        username: '',
        password: '',
        pulp_labels: {},
        download_concurrency: null,
        max_retries: null,
        policy: 'immediate',
        total_timeout: null,
        connect_timeout: null,
        sock_connect_timeout: null,
        sock_read_timeout: null,
        headers: [],
        rate_limit: null,
        sles_auth_token: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRemote(null);
    setFormData({
      name: '',
      url: '',
      ca_cert: '',
      client_cert: '',
      client_key: '',
      tls_validation: true,
      proxy_url: '',
      proxy_username: '',
      proxy_password: '',
      username: '',
      password: '',
      pulp_labels: {},
      download_concurrency: null,
      max_retries: null,
      policy: 'immediate',
      total_timeout: null,
      connect_timeout: null,
      sock_connect_timeout: null,
      sock_read_timeout: null,
      headers: [],
      rate_limit: null,
      sles_auth_token: '',
    });
  };

  const handleFormChange = (field: keyof RemoteFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload: any = {
        name: formData.name,
        url: formData.url,
        tls_validation: formData.tls_validation,
        policy: formData.policy,
      };

      // Only include optional fields if they have values
      if (formData.ca_cert) payload.ca_cert = formData.ca_cert;
      if (formData.client_cert) payload.client_cert = formData.client_cert;
      if (formData.client_key) payload.client_key = formData.client_key;
      if (formData.proxy_url) payload.proxy_url = formData.proxy_url;
      if (formData.proxy_username) payload.proxy_username = formData.proxy_username;
      if (formData.proxy_password) payload.proxy_password = formData.proxy_password;
      if (formData.username) payload.username = formData.username;
      if (formData.password) payload.password = formData.password;
      if (formData.download_concurrency) payload.download_concurrency = formData.download_concurrency;
      if (formData.max_retries !== null) payload.max_retries = formData.max_retries;
      if (formData.total_timeout !== null) payload.total_timeout = formData.total_timeout;
      if (formData.connect_timeout !== null) payload.connect_timeout = formData.connect_timeout;
      if (formData.sock_connect_timeout !== null) payload.sock_connect_timeout = formData.sock_connect_timeout;
      if (formData.sock_read_timeout !== null) payload.sock_read_timeout = formData.sock_read_timeout;
      if (formData.rate_limit !== null) payload.rate_limit = formData.rate_limit;
      if (formData.sles_auth_token) payload.sles_auth_token = formData.sles_auth_token;
      if (Object.keys(formData.pulp_labels).length > 0) payload.pulp_labels = formData.pulp_labels;
      if (formData.headers.length > 0) {
        payload.headers = formData.headers.map(h => ({ [h.name]: h.value }));
      }

      if (editingRemote) {
        // Update existing remote
        await apiService.put(`${editingRemote.pulp_href}`, payload);
        setSuccessMessage('Remote updated successfully');
      } else {
        // Create new remote
        await apiService.post('/remotes/rpm/rpm/', payload);
        setSuccessMessage('Remote created successfully');
      }

      handleCloseDialog();
      fetchRemotes();
    } catch (err) {
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
      setSuccessMessage('Remote deleted successfully');
      setDeleteConfirmOpen(false);
      setRemoteToDelete(null);
      fetchRemotes();
    } catch (err) {
      setError('Failed to delete remote');
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
        <Typography variant="h4">
          RPM Remotes
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
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
              <TableCell>Policy</TableCell>
              <TableCell>TLS Validation</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {remotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No remotes found
                </TableCell>
              </TableRow>
            ) : (
              remotes.map((remote) => (
                <TableRow key={remote.pulp_href}>
                  <TableCell>{remote.name}</TableCell>
                  <TableCell>{remote.url}</TableCell>
                  <TableCell>{remote.policy || 'immediate'}</TableCell>
                  <TableCell>{remote.tls_validation ? 'Yes' : 'No'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(remote)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(remote)}
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
          {editingRemote ? 'Edit Remote' : 'Create Remote'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              disabled={!!editingRemote}
              helperText="A unique name for this remote"
            />
            <TextField
              label="URL"
              fullWidth
              required
              value={formData.url}
              onChange={(e) => handleFormChange('url', e.target.value)}
              helperText="The URL of an external content source"
            />
            
            <Typography variant="h6" sx={{ mt: 2 }}>Authentication</Typography>
            <TextField
              label="Username"
              fullWidth
              value={formData.username}
              onChange={(e) => handleFormChange('username', e.target.value)}
              helperText="Username for authentication when syncing"
            />
            <TextField
              label="Password"
              fullWidth
              type="password"
              value={formData.password}
              onChange={(e) => handleFormChange('password', e.target.value)}
              helperText="Password for authentication when syncing"
            />
            
            <Typography variant="h6" sx={{ mt: 2 }}>TLS Settings</Typography>
            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.tls_validation}
                    onChange={(e) => handleFormChange('tls_validation', e.target.checked)}
                  />
                }
                label="TLS Validation"
              />
              <FormHelperText>If True, TLS peer validation must be performed</FormHelperText>
            </FormControl>
            <TextField
              label="CA Certificate"
              fullWidth
              multiline
              rows={3}
              value={formData.ca_cert}
              onChange={(e) => handleFormChange('ca_cert', e.target.value)}
              helperText="A PEM encoded CA certificate used to validate the server certificate"
            />
            <TextField
              label="Client Certificate"
              fullWidth
              multiline
              rows={3}
              value={formData.client_cert}
              onChange={(e) => handleFormChange('client_cert', e.target.value)}
              helperText="A PEM encoded client certificate used for authentication"
            />
            <TextField
              label="Client Key"
              fullWidth
              multiline
              rows={3}
              type="password"
              value={formData.client_key}
              onChange={(e) => handleFormChange('client_key', e.target.value)}
              helperText="A PEM encoded private key used for authentication"
            />
            
            <Typography variant="h6" sx={{ mt: 2 }}>Download Settings</Typography>
            <TextField
              label="Policy"
              fullWidth
              select
              value={formData.policy}
              onChange={(e) => handleFormChange('policy', e.target.value)}
              helperText="The policy to use when downloading content"
            >
              <MenuItem value="immediate">Immediate (download all metadata and content now)</MenuItem>
              <MenuItem value="on_demand">On Demand (download content as clients request it)</MenuItem>
              <MenuItem value="streamed">Streamed (download content as requested, never save)</MenuItem>
            </TextField>
            <TextField
              label="Download Concurrency"
              fullWidth
              type="number"
              value={formData.download_concurrency || ''}
              onChange={(e) => handleFormChange('download_concurrency', e.target.value ? parseInt(e.target.value) : null)}
              helperText="Total number of simultaneous connections"
            />
            <TextField
              label="Max Retries"
              fullWidth
              type="number"
              value={formData.max_retries || ''}
              onChange={(e) => handleFormChange('max_retries', e.target.value ? parseInt(e.target.value) : null)}
              helperText="Maximum number of retry attempts after a download failure"
            />
            <TextField
              label="Rate Limit"
              fullWidth
              type="number"
              value={formData.rate_limit || ''}
              onChange={(e) => handleFormChange('rate_limit', e.target.value ? parseInt(e.target.value) : null)}
              helperText="Limits requests per second for each concurrent downloader"
            />
            
            <Typography variant="h6" sx={{ mt: 2 }}>Proxy Settings</Typography>
            <TextField
              label="Proxy URL"
              fullWidth
              value={formData.proxy_url}
              onChange={(e) => handleFormChange('proxy_url', e.target.value)}
              helperText="The proxy URL. Format: scheme://host:port"
            />
            <TextField
              label="Proxy Username"
              fullWidth
              value={formData.proxy_username}
              onChange={(e) => handleFormChange('proxy_username', e.target.value)}
              helperText="The username to authenticate to the proxy"
            />
            <TextField
              label="Proxy Password"
              fullWidth
              type="password"
              value={formData.proxy_password}
              onChange={(e) => handleFormChange('proxy_password', e.target.value)}
              helperText="The password to authenticate to the proxy"
            />
            
            <Typography variant="h6" sx={{ mt: 2 }}>Timeout Settings (seconds)</Typography>
            <TextField
              label="Total Timeout"
              fullWidth
              type="number"
              value={formData.total_timeout || ''}
              onChange={(e) => handleFormChange('total_timeout', e.target.value ? parseFloat(e.target.value) : null)}
              helperText="Total timeout for download connections"
            />
            <TextField
              label="Connect Timeout"
              fullWidth
              type="number"
              value={formData.connect_timeout || ''}
              onChange={(e) => handleFormChange('connect_timeout', e.target.value ? parseFloat(e.target.value) : null)}
              helperText="Connect timeout for download connections"
            />
            <TextField
              label="Socket Connect Timeout"
              fullWidth
              type="number"
              value={formData.sock_connect_timeout || ''}
              onChange={(e) => handleFormChange('sock_connect_timeout', e.target.value ? parseFloat(e.target.value) : null)}
              helperText="Socket connect timeout for download connections"
            />
            <TextField
              label="Socket Read Timeout"
              fullWidth
              type="number"
              value={formData.sock_read_timeout || ''}
              onChange={(e) => handleFormChange('sock_read_timeout', e.target.value ? parseFloat(e.target.value) : null)}
              helperText="Socket read timeout for download connections"
            />
            
            <Typography variant="h6" sx={{ mt: 2 }}>Additional Settings</Typography>
            <TextField
              label="SLES Auth Token"
              fullWidth
              type="password"
              value={formData.sles_auth_token}
              onChange={(e) => handleFormChange('sles_auth_token', e.target.value)}
              helperText="Authentication token for SLES repositories"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={!formData.name.trim() || !formData.url.trim()}
          >
            {editingRemote ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the remote "{remoteToDelete?.name}"?
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
