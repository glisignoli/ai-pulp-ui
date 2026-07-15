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
import type { Distribution, Remote, Repository } from '../../types/pulp';
import type { PluginConfig } from '../../constants/plugins';
import { pluginRoutePaths } from '../../constants/plugins';
import { createPluginService } from '../../services/pluginCrud';
import { DEFAULT_PAGE_SIZE, formatPulpApiError } from '../../services/api';
import { pluginDistributionOrderingOptions } from '../../constants/orderingOptions';
import { ForegroundSnackbar } from '../ForegroundSnackbar';
import { DistributionFormDialog } from './DistributionFormDialog';
import { formatColumnValue } from './columns';

interface PluginDistributionProps {
  plugin: PluginConfig;
}

export const PluginDistribution: React.FC<PluginDistributionProps> = ({ plugin }) => {
  const navigate = useNavigate();
  const service = useMemo(() => createPluginService(plugin), [plugin]);
  const paths = useMemo(() => pluginRoutePaths(plugin), [plugin]);
  const hasPublications = !!service.publications;
  const hasPullThrough = plugin.hasPullThrough;
  const extraColumns = plugin.distributionColumns ?? [];

  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [remotes, setRemotes] = useState<Remote[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [ordering, setOrdering] = useState<string>('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingDistribution, setEditingDistribution] = useState<Distribution | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [distributionToDelete, setDistributionToDelete] = useState<Distribution | null>(null);

  const fetchDistributions = async (pageToLoad = page, orderingParam = ordering) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await service.distributions.list(offset, orderingParam);
      setDistributions(response.results);
      setTotalCount(response.count);
      setError(null);
    } catch {
      setError('Failed to load distributions');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async () => {
    try {
      const response = await service.repositories.list(0);
      setRepositories(response.results);
    } catch {
      // optional; only used to resolve repository names in the table
    }
  };

  const fetchRemotes = async () => {
    if (!hasPullThrough) return;
    try {
      const response = await service.remotes.list(0);
      setRemotes(response.results);
    } catch {
      // optional; only used to resolve remote names in the table
    }
  };

  useEffect(() => {
    void fetchDistributions(0);
    void fetchRepositories();
    void fetchRemotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugin]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    void fetchDistributions(newPage);
  };

  const handleOrderingChange = (newOrdering: string) => {
    setOrdering(newOrdering);
    setPage(0);
    void fetchDistributions(0, newOrdering);
  };

  const handleOpenDialog = (dist?: Distribution) => {
    setEditingDistribution(dist ?? null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDistribution(null);
  };

  const handleSaved = async (message: string) => {
    setSuccessMessage(message);
    await fetchDistributions();
  };

  const handleDeleteClick = (dist: Distribution) => {
    setDistributionToDelete(dist);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!distributionToDelete) return;

    try {
      await service.distributions.delete(distributionToDelete.pulp_href);
      setSuccessMessage('Distribution delete task started');
      setDeleteConfirmOpen(false);
      setDistributionToDelete(null);
      await fetchDistributions();
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete distribution'));
      setDeleteConfirmOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setDistributionToDelete(null);
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

  const columnCount = 4 + (hasPublications ? 1 : 0) + (hasPullThrough ? 1 : 0) + extraColumns.length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{plugin.label} Distributions</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Distribution
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
          {pluginDistributionOrderingOptions.map((opt) => (
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
                <TableCell>Base Path</TableCell>
                <TableCell>Repository</TableCell>
                {hasPublications ? <TableCell>Publication</TableCell> : null}
                {hasPullThrough ? <TableCell>Remote</TableCell> : null}
                {extraColumns.map((column) => (
                  <TableCell key={column.key}>{column.label}</TableCell>
                ))}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {distributions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} align="center">
                    No distributions found
                  </TableCell>
                </TableRow>
              ) : (
                distributions.map((dist) => (
                  <TableRow key={dist.pulp_href}>
                    <TableCell>{dist.name}</TableCell>
                    <TableCell>{dist.base_path}</TableCell>
                    <TableCell>
                      {dist.repository
                        ? repositories.find((r) => r.pulp_href === dist.repository)?.name || dist.repository
                        : dist.repository_version || '-'}
                    </TableCell>
                    {hasPublications ? <TableCell>{dist.publication || '-'}</TableCell> : null}
                    {hasPullThrough ? (
                      <TableCell>
                        {dist.remote
                          ? remotes.find((r) => r.pulp_href === dist.remote)?.name || dist.remote
                          : '-'}
                      </TableCell>
                    ) : null}
                    {extraColumns.map((column) => (
                      <TableCell key={column.key}>{formatColumnValue(dist, column)}</TableCell>
                    ))}
                    <TableCell>
                      <IconButton
                        color="primary"
                        title="View"
                        onClick={() =>
                          navigate(`${paths.distributionView}?href=${encodeURIComponent(dist.pulp_href)}`)
                        }
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton color="primary" title="Edit" onClick={() => handleOpenDialog(dist)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" title="Delete" onClick={() => handleDeleteClick(dist)}>
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

      <DistributionFormDialog
        plugin={plugin}
        open={openDialog}
        distribution={editingDistribution}
        onClose={handleCloseDialog}
        onSaved={handleSaved}
      />

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete distribution "{distributionToDelete?.name}"?</Typography>
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
