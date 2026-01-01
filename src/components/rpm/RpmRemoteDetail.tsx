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
  FormControlLabel,
  Checkbox,
  MenuItem,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService, formatPulpApiError } from '../../services/api';
import { Remote } from '../../types/pulp';

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
  pulp_labels: { [key: string]: string };
  download_concurrency: number | null;
  max_retries: number | null;
  policy: string;
  total_timeout: number | null;
  connect_timeout: number | null;
  sock_connect_timeout: number | null;
  sock_read_timeout: number | null;
  rate_limit: number | null;
  sles_auth_token: string;
}

export const RpmRemoteDetail: React.FC = () => {
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
    download_concurrency: 1,
    max_retries: 3,
    policy: 'immediate',
    total_timeout: null,
    connect_timeout: null,
    sock_connect_timeout: null,
    sock_read_timeout: null,
    rate_limit: 0,
    sles_auth_token: '',
  });

  const [pulpLabelsJson, setPulpLabelsJson] = useState('');
  const [pulpLabelsJsonError, setPulpLabelsJsonError] = useState<string | null>(null);

  const [headersJson, setHeadersJson] = useState('');
  const [headersJsonError, setHeadersJsonError] = useState<string | null>(null);

  const fetchRemote = async () => {
    if (!href) {
      setError('Missing remote href');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const rem = await apiService.get<Remote>(href);
      setRemote(rem);
      setError(null);
    } catch (err) {
      setError('Failed to load remote');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRemote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  const openEdit = () => {
    if (!remote) return;

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
      pulp_labels: remote.pulp_labels || {},
      download_concurrency: remote.download_concurrency ?? 1,
      max_retries: remote.max_retries !== undefined && remote.max_retries !== null ? remote.max_retries : 3,
      policy: remote.policy || 'immediate',
      total_timeout: remote.total_timeout || null,
      connect_timeout: remote.connect_timeout || null,
      sock_connect_timeout: remote.sock_connect_timeout || null,
      sock_read_timeout: remote.sock_read_timeout || null,
      rate_limit: remote.rate_limit ?? 0,
      sles_auth_token: remote.sles_auth_token || '',
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
  };

  const handleFormChange = (field: keyof RemoteFormData, value: string | number | boolean | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitEdit = async () => {
    if (!remote) return;

    try {
      const downloadConcurrencyInvalid = formData.download_concurrency !== null && formData.download_concurrency < 1;
      const rateLimitInvalid = formData.rate_limit !== null && formData.rate_limit < 0;

      if (downloadConcurrencyInvalid) {
        setError('Download Concurrency must be >= 1');
        return;
      }
      if (rateLimitInvalid) {
        setError('Rate Limit must be >= 0');
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

      // Optional fields
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
      if (formData.sles_auth_token) payload.sles_auth_token = formData.sles_auth_token;
      if (pulpLabels && Object.keys(pulpLabels).length > 0) payload.pulp_labels = pulpLabels;
      if (headers && Object.keys(headers).length > 0) payload.headers = headers;

      await apiService.put(remote.pulp_href, payload);
      setSuccessMessage('Remote updated successfully');
      setEditOpen(false);
      await fetchRemote();
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to update remote'));
    }
  };

  const confirmDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
  };

  const executeDelete = async () => {
    if (!remote) return;

    try {
      await apiService.delete(remote.pulp_href);
      setSuccessMessage('Remote deleted successfully');
      setDeleteConfirmOpen(false);
      setTimeout(() => {
        navigate('/rpm/remote');
      }, 1500);
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to delete remote'));
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

  if (error && !remote) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/rpm/remote')}>
          Back to Remotes
        </Button>
      </Container>
    );
  }

  if (!remote) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          Remote not found
        </Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/rpm/remote')}>
          Back to Remotes
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Remote: {remote.name}</Typography>
        <Box>
          <Button variant="outlined" sx={{ mr: 1 }} onClick={() => navigate('/rpm/remote')}>
            Back
          </Button>
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
          {JSON.stringify(remote, null, 2)}
        </Box>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={closeEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit Remote</DialogTitle>
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
              label="URL"
              fullWidth
              required
              value={formData.url}
              onChange={(e) => handleFormChange('url', e.target.value)}
            />
            <TextField
              select
              label="Policy"
              fullWidth
              value={formData.policy}
              onChange={(e) => handleFormChange('policy', e.target.value)}
            >
              <MenuItem value="immediate">Immediate</MenuItem>
              <MenuItem value="on_demand">On Demand</MenuItem>
              <MenuItem value="streamed">Streamed</MenuItem>
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
              label="CA Certificate"
              fullWidth
              multiline
              rows={3}
              value={formData.ca_cert}
              onChange={(e) => handleFormChange('ca_cert', e.target.value)}
              helperText="Optional: PEM encoded CA certificate"
            />
            <TextField
              label="Client Certificate"
              fullWidth
              multiline
              rows={3}
              value={formData.client_cert}
              onChange={(e) => handleFormChange('client_cert', e.target.value)}
              helperText="Optional: PEM encoded client certificate"
            />
            <TextField
              label="Client Key"
              fullWidth
              multiline
              rows={3}
              value={formData.client_key}
              onChange={(e) => handleFormChange('client_key', e.target.value)}
              helperText="Optional: PEM encoded client key"
            />
            <TextField
              label="Proxy URL"
              fullWidth
              value={formData.proxy_url}
              onChange={(e) => handleFormChange('proxy_url', e.target.value)}
            />
            <TextField
              label="Username"
              fullWidth
              value={formData.username}
              onChange={(e) => handleFormChange('username', e.target.value)}
              helperText="Optional: Username for authentication"
            />
            <TextField
              label="Password"
              fullWidth
              type="password"
              value={formData.password}
              onChange={(e) => handleFormChange('password', e.target.value)}
              helperText="Optional: Password for authentication"
            />
            <TextField
              label="Download Concurrency"
              fullWidth
              type="number"
              value={formData.download_concurrency ?? ''}
              onChange={(e) => handleFormChange('download_concurrency', e.target.value ? parseInt(e.target.value) : null)}
              error={formData.download_concurrency !== null && formData.download_concurrency < 1}
              helperText={
                formData.download_concurrency !== null && formData.download_concurrency < 1
                  ? 'Must be >= 1'
                  : undefined
              }
            />
            <TextField
              label="Max Retries"
              fullWidth
              type="number"
              value={formData.max_retries || ''}
              onChange={(e) => handleFormChange('max_retries', e.target.value ? parseInt(e.target.value) : null)}
            />
            <TextField
              label="Rate Limit"
              fullWidth
              type="number"
              value={formData.rate_limit ?? ''}
              onChange={(e) => handleFormChange('rate_limit', e.target.value ? parseInt(e.target.value) : null)}
              helperText="Requests per second"
              error={formData.rate_limit !== null && formData.rate_limit < 0}
            />

            <TextField
              label="Pulp Labels (JSON)"
              fullWidth
              multiline
              minRows={3}
              value={pulpLabelsJson}
              onChange={(e) => {
                setPulpLabelsJson(e.target.value);
                if (!e.target.value.trim()) setPulpLabelsJsonError(null);
              }}
              error={!!pulpLabelsJsonError}
              helperText={pulpLabelsJsonError || 'Optional: JSON object of string-to-string labels'}
            />

            <TextField
              label="Headers (JSON)"
              fullWidth
              multiline
              minRows={3}
              value={headersJson}
              onChange={(e) => {
                setHeadersJson(e.target.value);
                if (!e.target.value.trim()) setHeadersJsonError(null);
              }}
              error={!!headersJsonError}
              helperText={
                headersJsonError ||
                'Optional: JSON object of string-to-string HTTP headers (example: {"Authorization":"Bearer ..."})'
              }
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
            Are you sure you want to delete the remote "{remote.name}"? This action cannot be undone.
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
