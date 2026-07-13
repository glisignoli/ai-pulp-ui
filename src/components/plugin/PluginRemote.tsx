import React, { useEffect, useMemo, useState } from 'react';
import {
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
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
import type { Remote } from '../../types/pulp';
import type { PluginConfig, RemotePolicy } from '../../constants/plugins';
import { pluginRoutePaths } from '../../constants/plugins';
import { createPluginService } from '../../services/pluginCrud';
import { DEFAULT_PAGE_SIZE, formatPulpApiError } from '../../services/api';
import { pluginRemoteOrderingOptions } from '../../constants/orderingOptions';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

interface RemoteFormData {
  name: string;
  url: string;
  policy: RemotePolicy;
  tls_validation: boolean;
  username: string;
  password: string;
  proxy_url: string;
}

interface PluginRemoteProps {
  plugin: PluginConfig;
}

export const PluginRemote: React.FC<PluginRemoteProps> = ({ plugin }) => {
  const navigate = useNavigate();
  const service = useMemo(() => createPluginService(plugin), [plugin]);
  const paths = useMemo(() => pluginRoutePaths(plugin), [plugin]);

  const emptyForm: RemoteFormData = {
    name: '',
    url: '',
    policy: plugin.remotePolicies[0],
    tls_validation: true,
    username: '',
    password: '',
    proxy_url: '',
  };

  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [ordering, setOrdering] = useState<string>('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRemote, setEditingRemote] = useState<Remote | null>(null);
  const [formData, setFormData] = useState<RemoteFormData>(emptyForm);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [remoteToDelete, setRemoteToDelete] = useState<Remote | null>(null);

  const fetchRemotes = async (pageToLoad = page) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await service.remotes.list(offset, ordering);
      setRemotes(response.results);
      setTotalCount(response.count);
      setError(null);
    } catch {
      setError('Failed to load remotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRemotes(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugin]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    void fetchRemotes(newPage);
  };

  const handleOrderingChange = (newOrdering: string) => {
    setOrdering(newOrdering);
    setPage(0);
    void fetchRemotes(0);
  };

  const handleOpenDialog = (remote?: Remote) => {
    if (remote) {
      setEditingRemote(remote);
      setFormData({
        name: remote.name,
        url: remote.url,
        policy: (remote.policy as RemotePolicy) || plugin.remotePolicies[0],
        tls_validation: remote.tls_validation ?? true,
        username: '',
        password: '',
        proxy_url: remote.proxy_url || '',
      });
    } else {
      setEditingRemote(null);
      setFormData(emptyForm);
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
        policy: formData.policy,
        tls_validation: formData.tls_validation,
      };

      if (formData.username) payload.username = formData.username;
      if (formData.password) payload.password = formData.password;
      if (formData.proxy_url) payload.proxy_url = formData.proxy_url;

      if (editingRemote) {
        await service.remotes.update(editingRemote.pulp_href, payload);
        setSuccessMessage('Remote updated successfully');
      } else {
        await service.remotes.create(payload);
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
      await service.remotes.delete(remoteToDelete.pulp_href);
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
        <Typography variant="h4">{plugin.label} Remotes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Remote
        </Button>
      </Box>

      <Box display="flex" justifyContent="flex-start" alignItems="center" mb={2}>
        <TextField
          select
          size="small"
          label="Order by"
          value={ordering}
          onChange={(e) => handleOrderingChange(e.target.value)}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="">Default</MenuItem>
          {pluginRemoteOrderingOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
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
                <TableCell>Policy</TableCell>
                <TableCell>Actions</TableCell>
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
                    <TableCell>{remote.policy || '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        title="View"
                        onClick={() =>
                          navigate(`${paths.remoteView}?href=${encodeURIComponent(remote.pulp_href)}`)
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
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={DEFAULT_PAGE_SIZE}
          rowsPerPageOptions={[DEFAULT_PAGE_SIZE]}
        />
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
            select
            fullWidth
            margin="normal"
            label="Policy"
            value={formData.policy}
            onChange={(e) => handleFormChange('policy', e.target.value)}
            helperText="Download policy for this remote"
          >
            {plugin.remotePolicies.map((policy) => (
              <MenuItem key={policy} value={policy}>
                {policy}
              </MenuItem>
            ))}
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
            helperText="Username for authentication when syncing"
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => handleFormChange('password', e.target.value)}
            helperText="Password for authentication when syncing"
          />
          <TextField
            fullWidth
            margin="normal"
            label="Proxy URL"
            value={formData.proxy_url}
            onChange={(e) => handleFormChange('proxy_url', e.target.value)}
            helperText="The proxy URL. Format: scheme://host:port"
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
