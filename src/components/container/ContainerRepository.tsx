import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
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
import type { Remote, Repository } from '../../types/pulp';
import { containerService } from '../../services/container';
import { DEFAULT_PAGE_SIZE, formatPulpApiError } from '../../services/api';
import { containerRepositoryOrderingOptions } from '../../constants/orderingOptions';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

interface RepositoryFormData {
  name: string;
  description: string;
  retain_repo_versions: number | null;
  remote: string;
  manifest_signing_service: string;
}

export const ContainerRepository: React.FC = () => {
  const navigate = useNavigate();

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [remotes, setRemotes] = useState<Remote[]>([]);

  const [loading, setLoading] = useState(true);
  const [remotesLoading, setRemotesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [ordering, setOrdering] = useState<string>('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null);
  const [formData, setFormData] = useState<RepositoryFormData>({
    name: '',
    description: '',
    retain_repo_versions: null,
    remote: '',
    manifest_signing_service: '',
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<Repository | null>(null);

  const remoteOptions = useMemo(() => remotes.map((r) => ({ label: r.name, value: r.pulp_href })), [remotes]);

  const fetchRepositories = async (pageToLoad = page) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await containerService.repositories.list(offset, ordering);
      setRepositories(response.results);
      setTotalCount(response.count);
      setError(null);
    } catch {
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const fetchRemotes = async () => {
    try {
      setRemotesLoading(true);
      const response = await containerService.remotes.list(0);
      setRemotes(response.results);
    } catch {
      // optional
    } finally {
      setRemotesLoading(false);
    }
  };

  useEffect(() => {
    void fetchRepositories(0);
    void fetchRemotes();
  }, []);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    void fetchRepositories(newPage);
  };

  const handleOrderingChange = (newOrdering: string) => {
    setOrdering(newOrdering);
    setPage(0);
    void fetchRepositories(0);
  };

  const handleOpenDialog = (repo?: Repository) => {
    if (repo) {
      setEditingRepo(repo);
      setFormData({
        name: repo.name,
        description: repo.description || '',
        retain_repo_versions: repo.retain_repo_versions ?? null,
        remote: repo.remote || '',
        manifest_signing_service: (repo as any).manifest_signing_service || '',
      });
    } else {
      setEditingRepo(null);
      setFormData({
        name: '',
        description: '',
        retain_repo_versions: null,
        remote: '',
        manifest_signing_service: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRepo(null);
  };

  const handleFormChange = (field: keyof RepositoryFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description.trim() || null,
        retain_repo_versions: formData.retain_repo_versions,
        remote: formData.remote || null,
        manifest_signing_service: formData.manifest_signing_service || null,
      };

      if (editingRepo) {
        await containerService.repositories.update(editingRepo.pulp_href, payload);
        setSuccessMessage('Repository updated successfully');
      } else {
        await containerService.repositories.create(payload);
        setSuccessMessage('Repository created successfully');
      }

      handleCloseDialog();
      await fetchRepositories();
    } catch (error) {
      setError(formatPulpApiError(error, `Failed to ${editingRepo ? 'update' : 'create'} repository`));
    }
  };

  const handleDeleteClick = (repo: Repository) => {
    setRepoToDelete(repo);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!repoToDelete) return;

    try {
      await containerService.repositories.delete(repoToDelete.pulp_href);
      setSuccessMessage('Repository delete task started');
      setDeleteConfirmOpen(false);
      setRepoToDelete(null);
      await fetchRepositories();
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete repository'));
      setDeleteConfirmOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setRepoToDelete(null);
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
        <Typography variant="h4">Container Repositories</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Repository
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
          {containerRepositoryOrderingOptions.map((opt) => (
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
                <TableCell>Description</TableCell>
                <TableCell>Remote</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {repositories.map((repo) => (
                <TableRow key={repo.pulp_href}>
                  <TableCell>{repo.name}</TableCell>
                  <TableCell>{repo.description || '-'}</TableCell>
                  <TableCell>
                    {repo.remote
                      ? remotes.find((r) => r.pulp_href === repo.remote)?.name || repo.remote
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      title="View"
                      onClick={() =>
                        navigate(`/container/repository/view?href=${encodeURIComponent(repo.pulp_href)}`)
                      }
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton color="primary" title="Edit" onClick={() => handleOpenDialog(repo)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" title="Delete" onClick={() => handleDeleteClick(repo)}>
                      <DeleteIcon />
                    </IconButton>
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRepo ? 'Edit Repository' : 'Create Repository'}</DialogTitle>
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
            label="Description"
            value={formData.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Retain Repo Versions"
            type="number"
            value={formData.retain_repo_versions ?? ''}
            onChange={(e) =>
              handleFormChange('retain_repo_versions', e.target.value ? Number(e.target.value) : null)
            }
          />

          <Autocomplete
            options={remoteOptions}
            loading={remotesLoading}
            value={remoteOptions.find((o) => o.value === formData.remote) || null}
            onChange={(_, value) => handleFormChange('remote', value?.value || '')}
            renderInput={(params) => <TextField {...params} label="Remote" margin="normal" />}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Manifest Signing Service (href)"
            value={formData.manifest_signing_service}
            onChange={(e) => handleFormChange('manifest_signing_service', e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingRepo ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete repository "{repoToDelete?.name}"?</Typography>
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
