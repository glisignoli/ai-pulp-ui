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
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Paper,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Cancel as CancelIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  apiService,
  DEFAULT_PAGE_SIZE,
  formatPulpApiError,
  withPaginationParams,
  withQueryParams,
} from '../../services/api';
import { PulpListResponse, Task } from '../../types/pulp';
import { taskOrderingOptions } from '../../constants/orderingOptions';

export const Tasks: React.FC = () => {
  const TASK_STATES = ['canceled', 'canceling', 'completed', 'failed', 'running', 'skipped', 'waiting'] as const;

  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string>('');
  const [ordering, setOrdering] = useState<string>('');

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [busyByHref, setBusyByHref] = useState<Record<string, boolean>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const fetchTasks = async (pageToLoad = page, orderingToUse = ordering, stateToUse = stateFilter) => {
    try {
      setLoading(true);
      const baseEndpoint = stateToUse ? withQueryParams('/tasks/', { state: stateToUse }) : '/tasks/';
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await apiService.get<PulpListResponse<Task>>(
        withPaginationParams(baseEndpoint, { offset, ordering: orderingToUse })
      );
      setTasks(response.results);
      setTotalCount(response.count);
      setError(null);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchTasks(0, ordering, stateFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter]);

  const handleOrderingChange = (newOrdering: string) => {
    setOrdering(newOrdering);
    setPage(0);
    void fetchTasks(0, newOrdering, stateFilter);
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    void fetchTasks(newPage);
  };

  const viewTask = (href: string) => {
    navigate(`/tasks/view?href=${encodeURIComponent(href)}`);
  };

  const isCancelableTask = (task: Task): boolean => task.state === 'running' || task.state === 'waiting';

  const isDeletableTask = (task: Task): boolean =>
    task.state === 'completed' || task.state === 'failed' || task.state === 'canceled' || task.state === 'skipped';

  const cancelTask = async (task: Task) => {
    if (!task.pulp_href) return;

    try {
      setBusyByHref((prev) => ({ ...prev, [task.pulp_href]: true }));
      await apiService.patch(task.pulp_href, { state: 'canceled' });
      setError(null);
      await fetchTasks();
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to cancel task'));
    } finally {
      setBusyByHref((prev) => ({ ...prev, [task.pulp_href]: false }));
    }
  };

  const openDeleteConfirm = (task: Task) => {
    setTaskToDelete(task);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setTaskToDelete(null);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete?.pulp_href) return;

    try {
      setBusyByHref((prev) => ({ ...prev, [taskToDelete.pulp_href]: true }));
      await apiService.delete(taskToDelete.pulp_href);
      setError(null);
      closeDeleteConfirm();
      await fetchTasks();
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete task'));
      closeDeleteConfirm();
    } finally {
      setBusyByHref((prev) => ({ ...prev, [taskToDelete.pulp_href]: false }));
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
      <Typography variant="h4" gutterBottom>
        Tasks
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 220 }} size="small">
          <InputLabel id="tasks-state-filter-label">State</InputLabel>
          <Select
            labelId="tasks-state-filter-label"
            value={stateFilter}
            label="State"
            onChange={(e) => setStateFilter(String(e.target.value))}
          >
            <MenuItem value="">All</MenuItem>
            {TASK_STATES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 260 }} size="small">
          <InputLabel id="tasks-ordering-label">Order by</InputLabel>
          <Select
            labelId="tasks-ordering-label"
            value={ordering}
            label="Order by"
            onChange={(e) => handleOrderingChange(String(e.target.value))}
          >
            <MenuItem value="">Default</MenuItem>
            {taskOrderingOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!error && tasks.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No tasks found
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Started</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.pulp_href} hover>
                  <TableCell>{task.name || '(unknown)'}</TableCell>
                  <TableCell>{task.state || '(unknown)'}</TableCell>
                  <TableCell>{task.pulp_created || ''}</TableCell>
                  <TableCell>{task.started_at || ''}</TableCell>
                  <TableCell align="right">
                    {isCancelableTask(task) && (
                      <Tooltip title="Cancel">
                        <span>
                          <IconButton
                            aria-label="Cancel"
                            onClick={() => cancelTask(task)}
                            size="small"
                            disabled={Boolean(task.pulp_href && busyByHref[task.pulp_href])}
                          >
                            <CancelIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}

                    {isDeletableTask(task) && (
                      <Tooltip title="Delete">
                        <span>
                          <IconButton
                            aria-label="Delete"
                            onClick={() => openDeleteConfirm(task)}
                            size="small"
                            color="error"
                            disabled={Boolean(task.pulp_href && busyByHref[task.pulp_href])}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}

                    <Tooltip title="View">
                      <IconButton
                        aria-label="View"
                        onClick={() => viewTask(task.pulp_href)}
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
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

      <Dialog open={deleteConfirmOpen} onClose={closeDeleteConfirm} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Task</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete this task? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirm}>Cancel</Button>
          <Button color="error" onClick={confirmDeleteTask} variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
