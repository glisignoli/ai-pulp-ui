import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import type { PluginConfig } from '../../constants/plugins';
import { pluginRoutePaths } from '../../constants/plugins';
import { createPluginService } from '../../services/pluginCrud';
import { DEFAULT_PAGE_SIZE, formatPulpApiError } from '../../services/api';
import { pluginRemoteOrderingOptions } from '../../constants/orderingOptions';
import { ForegroundSnackbar } from '../ForegroundSnackbar';
import { RemoteFormDialog } from './RemoteFormDialog';
import { formatColumnValue } from './columns';

interface PluginRemoteProps {
  plugin: PluginConfig;
}

export const PluginRemote: React.FC<PluginRemoteProps> = ({ plugin }) => {
  const navigate = useNavigate();
  const service = useMemo(() => createPluginService(plugin), [plugin]);
  const paths = useMemo(() => pluginRoutePaths(plugin), [plugin]);
  const extraColumns = plugin.remoteColumns ?? [];

  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [ordering, setOrdering] = useState<string>('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRemote, setEditingRemote] = useState<Remote | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [remoteToDelete, setRemoteToDelete] = useState<Remote | null>(null);

  const fetchRemotes = async (pageToLoad = page, orderingParam = ordering) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await service.remotes.list(offset, orderingParam);
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
    void fetchRemotes(0, newOrdering);
  };

  const handleOpenDialog = (remote?: Remote) => {
    setEditingRemote(remote ?? null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRemote(null);
  };

  const handleSaved = async (message: string) => {
    setSuccessMessage(message);
    await fetchRemotes();
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
                {extraColumns.map((column) => (
                  <TableCell key={column.key}>{column.label}</TableCell>
                ))}
                <TableCell>Policy</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {remotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4 + extraColumns.length} align="center">
                    No remotes found
                  </TableCell>
                </TableRow>
              ) : (
                remotes.map((remote) => (
                  <TableRow key={remote.pulp_href}>
                    <TableCell>{remote.name}</TableCell>
                    <TableCell>{remote.url}</TableCell>
                    {extraColumns.map((column) => (
                      <TableCell key={column.key}>{formatColumnValue(remote, column)}</TableCell>
                    ))}
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

      <RemoteFormDialog
        plugin={plugin}
        open={openDialog}
        remote={editingRemote}
        onClose={handleCloseDialog}
        onSaved={handleSaved}
      />

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
