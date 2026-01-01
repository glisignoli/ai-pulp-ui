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
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
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
import { PulpListResponse, Remote } from '../../types/pulp';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

function parsePulpLabelsJson(input: string): { labels: Record<string, string> | null; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { labels: null, error: null };

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { labels: null, error: 'Invalid pulp_labels JSON (must be an object of string values)' };
    }
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        return { labels: null, error: 'Invalid pulp_labels JSON (must be an object of string values)' };
      }
      if (typeof key !== 'string') {
        return { labels: null, error: 'Invalid pulp_labels JSON (must be an object of string values)' };
      }
    }

    return { labels: parsed as Record<string, string>, error: null };
  } catch {
    return { labels: null, error: 'Invalid pulp_labels JSON (must be an object of string values)' };
  }
}

function parseHeadersJson(input: string): { headers: Record<string, string> | null; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { headers: null, error: null };

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { headers: null, error: 'Invalid headers JSON (must be an object of string values)' };
    }
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        return { headers: null, error: 'Invalid headers JSON (must be an object of string values)' };
      }
    }

    return { headers: parsed as Record<string, string>, error: null };
  } catch {
    return { headers: null, error: 'Invalid headers JSON (must be an object of string values)' };
  }
}

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
  download_concurrency: number | null;
  max_retries: number | null;
  policy: 'immediate' | 'on_demand' | 'streamed';
  rate_limit: number | null;
  total_timeout: number | null;
  connect_timeout: number | null;
  sock_connect_timeout: number | null;
  sock_read_timeout: number | null;
}

export const FileRemote: React.FC = () => {
  const navigate = useNavigate();

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
    download_concurrency: 1,
    max_retries: 3,
    policy: 'immediate',
    rate_limit: 0,
    total_timeout: null,
    connect_timeout: null,
    sock_connect_timeout: null,
    sock_read_timeout: null,
  });

  const [pulpLabelsJson, setPulpLabelsJson] = useState('');
  const [pulpLabelsJsonError, setPulpLabelsJsonError] = useState<string | null>(null);
  const [headersJson, setHeadersJson] = useState('');
  const [headersJsonError, setHeadersJsonError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [remoteToDelete, setRemoteToDelete] = useState<Remote | null>(null);

  const fetchRemotes = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<Remote>>('/remotes/file/file/');
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
      setPulpLabelsJson(remote.pulp_labels ? JSON.stringify(remote.pulp_labels, null, 2) : '');
      setPulpLabelsJsonError(null);
      setHeadersJson(remote.headers ? JSON.stringify(remote.headers, null, 2) : '');
      setHeadersJsonError(null);
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
        download_concurrency: remote.download_concurrency ?? 1,
        max_retries: remote.max_retries !== undefined && remote.max_retries !== null ? remote.max_retries : 3,
        policy: (remote.policy as any) || 'immediate',
        rate_limit: remote.rate_limit ?? 0,
        total_timeout: remote.total_timeout || null,
        connect_timeout: remote.connect_timeout || null,
        sock_connect_timeout: remote.sock_connect_timeout || null,
        sock_read_timeout: remote.sock_read_timeout || null,
      });
    } else {
      setEditingRemote(null);
      setPulpLabelsJson('');
      setPulpLabelsJsonError(null);
      setHeadersJson('');
      setHeadersJsonError(null);
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
        download_concurrency: 1,
        max_retries: 3,
        policy: 'immediate',
        rate_limit: 0,
        total_timeout: null,
        connect_timeout: null,
        sock_connect_timeout: null,
        sock_read_timeout: null,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRemote(null);
    setPulpLabelsJson('');
    setPulpLabelsJsonError(null);
    setHeadersJson('');
    setHeadersJsonError(null);
  };

  const handleFormChange = (field: keyof RemoteFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const downloadConcurrencyInvalid = formData.download_concurrency !== null && formData.download_concurrency < 1;
      const rateLimitInvalid = formData.rate_limit !== null && formData.rate_limit < 0;
      const totalTimeoutInvalid = formData.total_timeout !== null && formData.total_timeout < 0;
      const connectTimeoutInvalid = formData.connect_timeout !== null && formData.connect_timeout < 0;
      const sockConnectTimeoutInvalid = formData.sock_connect_timeout !== null && formData.sock_connect_timeout < 0;
      const sockReadTimeoutInvalid = formData.sock_read_timeout !== null && formData.sock_read_timeout < 0;

      if (downloadConcurrencyInvalid) {
        setError('Download Concurrency must be >= 1');
        return;
      }
      if (rateLimitInvalid) {
        setError('Rate Limit must be >= 0');
        return;
      }
      if (totalTimeoutInvalid) {
        setError('Total Timeout must be >= 0');
        return;
      }
      if (connectTimeoutInvalid) {
        setError('Connect Timeout must be >= 0');
        return;
      }
      if (sockConnectTimeoutInvalid) {
        setError('Socket Connect Timeout must be >= 0');
        return;
      }
      if (sockReadTimeoutInvalid) {
        setError('Socket Read Timeout must be >= 0');
        return;
      }

      const { labels: pulpLabels, error: pulpLabelsError } = parsePulpLabelsJson(pulpLabelsJson);
      setPulpLabelsJsonError(pulpLabelsError);
      if (pulpLabelsError) {
        setError(pulpLabelsError);
        return;
      }

      const { headers, error: headersError } = parseHeadersJson(headersJson);
      setHeadersJsonError(headersError);
      if (headersError) {
        setError(headersError);
        return;
      }

      const payload: any = {
        name: formData.name,
        url: formData.url,
        tls_validation: formData.tls_validation,
        policy: formData.policy,
      };

      if (formData.ca_cert) payload.ca_cert = formData.ca_cert;
      if (formData.client_cert) payload.client_cert = formData.client_cert;
      if (formData.client_key) payload.client_key = formData.client_key;
      if (formData.proxy_url) payload.proxy_url = formData.proxy_url;
      if (formData.proxy_username) payload.proxy_username = formData.proxy_username;
      if (formData.proxy_password) payload.proxy_password = formData.proxy_password;
      if (formData.username) payload.username = formData.username;
      if (formData.password) payload.password = formData.password;
      if (formData.download_concurrency !== null) payload.download_concurrency = formData.download_concurrency;
      if (formData.max_retries !== null) payload.max_retries = formData.max_retries;
      if (formData.total_timeout !== null) payload.total_timeout = formData.total_timeout;
      if (formData.connect_timeout !== null) payload.connect_timeout = formData.connect_timeout;
      if (formData.sock_connect_timeout !== null) payload.sock_connect_timeout = formData.sock_connect_timeout;
      if (formData.sock_read_timeout !== null) payload.sock_read_timeout = formData.sock_read_timeout;
      if (formData.rate_limit !== null) payload.rate_limit = formData.rate_limit;
      if (pulpLabels && Object.keys(pulpLabels).length > 0) payload.pulp_labels = pulpLabels;
      if (headers && Object.keys(headers).length > 0) payload.headers = headers;

      if (editingRemote) {
        await apiService.put(editingRemote.pulp_href, payload);
        setSuccessMessage('Remote updated successfully');
      } else {
        await apiService.post('/remotes/file/file/', payload);
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
      await apiService.delete(remoteToDelete.pulp_href);
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
        <Typography variant="h4">File Remotes</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Remote
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
              <TableCell>URL</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {remotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No remotes found
                </TableCell>
              </TableRow>
            ) : (
              remotes.map((remote) => (
                <TableRow key={remote.pulp_href}>
                  <TableCell>{remote.name}</TableCell>
                  <TableCell>{remote.url}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/file/remote/view?href=${encodeURIComponent(remote.pulp_href)}`)}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRemote ? 'Edit Remote' : 'Create Remote'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              required
              disabled={!!editingRemote}
            />
            <TextField
              label="URL"
              fullWidth
              value={formData.url}
              onChange={(e) => handleFormChange('url', e.target.value)}
              required
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

            <FormControl fullWidth>
              <TextField
                select
                label="Policy"
                value={formData.policy}
                onChange={(e) => handleFormChange('policy', e.target.value)}
                helperText="Download policy for this remote"
              >
                <MenuItem value="immediate">immediate</MenuItem>
                <MenuItem value="on_demand">on_demand</MenuItem>
                <MenuItem value="streamed">streamed</MenuItem>
              </TextField>
            </FormControl>

            <TextField
              label="Download Concurrency"
              fullWidth
              type="number"
              value={formData.download_concurrency ?? ''}
              onChange={(e) =>
                handleFormChange('download_concurrency', e.target.value ? parseInt(e.target.value) : null)
              }
              error={formData.download_concurrency !== null && formData.download_concurrency < 1}
              helperText={
                formData.download_concurrency !== null && formData.download_concurrency < 1
                  ? 'Must be >= 1'
                  : 'Total number of simultaneous connections'
              }
            />
            <TextField
              label="Max Retries"
              fullWidth
              type="number"
              value={formData.max_retries ?? ''}
              onChange={(e) => handleFormChange('max_retries', e.target.value ? parseInt(e.target.value) : null)}
              helperText="Maximum number of retry attempts after a download failure"
            />
            <TextField
              label="Rate Limit"
              fullWidth
              type="number"
              value={formData.rate_limit ?? ''}
              onChange={(e) => handleFormChange('rate_limit', e.target.value ? parseInt(e.target.value) : null)}
              error={formData.rate_limit !== null && formData.rate_limit < 0}
              helperText={
                formData.rate_limit !== null && formData.rate_limit < 0
                  ? 'Must be >= 0'
                  : 'Limits requests per second for each concurrent downloader'
              }
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
              value={formData.total_timeout ?? ''}
              onChange={(e) => handleFormChange('total_timeout', e.target.value ? parseInt(e.target.value) : null)}
              error={formData.total_timeout !== null && formData.total_timeout < 0}
              helperText={
                formData.total_timeout !== null && formData.total_timeout < 0
                  ? 'Must be >= 0'
                  : 'The total timeout for an HTTP request'
              }
            />
            <TextField
              label="Connect Timeout"
              fullWidth
              type="number"
              value={formData.connect_timeout ?? ''}
              onChange={(e) => handleFormChange('connect_timeout', e.target.value ? parseInt(e.target.value) : null)}
              error={formData.connect_timeout !== null && formData.connect_timeout < 0}
              helperText={
                formData.connect_timeout !== null && formData.connect_timeout < 0
                  ? 'Must be >= 0'
                  : 'The timeout for establishing a connection'
              }
            />
            <TextField
              label="Socket Connect Timeout"
              fullWidth
              type="number"
              value={formData.sock_connect_timeout ?? ''}
              onChange={(e) =>
                handleFormChange('sock_connect_timeout', e.target.value ? parseInt(e.target.value) : null)
              }
              error={formData.sock_connect_timeout !== null && formData.sock_connect_timeout < 0}
              helperText={
                formData.sock_connect_timeout !== null && formData.sock_connect_timeout < 0
                  ? 'Must be >= 0'
                  : 'The timeout for connecting to a socket'
              }
            />
            <TextField
              label="Socket Read Timeout"
              fullWidth
              type="number"
              value={formData.sock_read_timeout ?? ''}
              onChange={(e) => handleFormChange('sock_read_timeout', e.target.value ? parseInt(e.target.value) : null)}
              error={formData.sock_read_timeout !== null && formData.sock_read_timeout < 0}
              helperText={
                formData.sock_read_timeout !== null && formData.sock_read_timeout < 0
                  ? 'Must be >= 0'
                  : 'The timeout for reading from a socket'
              }
            />

            <Typography variant="h6" sx={{ mt: 2 }}>Labels & Headers</Typography>
            <TextField
              label="pulp_labels"
              fullWidth
              multiline
              minRows={3}
              value={pulpLabelsJson}
              onChange={(e) => {
                setPulpLabelsJson(e.target.value);
                if (!e.target.value.trim()) setPulpLabelsJsonError(null);
              }}
              error={!!pulpLabelsJsonError}
              helperText={pulpLabelsJsonError ?? 'Optional. JSON object of string values'}
            />
            <TextField
              label="headers"
              fullWidth
              multiline
              minRows={3}
              value={headersJson}
              onChange={(e) => {
                setHeadersJson(e.target.value);
                if (!e.target.value.trim()) setHeadersJsonError(null);
              }}
              error={!!headersJsonError}
              helperText={headersJsonError ?? 'Optional. JSON object of string values'}
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

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Remote</DialogTitle>
        <DialogContent>Are you sure you want to delete remote "{remoteToDelete?.name}"?</DialogContent>
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};
