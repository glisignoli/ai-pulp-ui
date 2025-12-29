import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Remote, Repository, RepositoryVersion } from '../../types/pulp';
import { containerService } from '../../services/container';

interface RepositoryFormData {
  name: string;
  description: string;
  retain_repo_versions: number | null;
  remote: string;
  manifest_signing_service: string;
}

export const ContainerRepositoryDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const href = searchParams.get('href') || '';

  const [repository, setRepository] = useState<Repository | null>(null);
  const [versions, setVersions] = useState<RepositoryVersion[]>([]);

  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [remotesLoading, setRemotesLoading] = useState(false);

  const [formData, setFormData] = useState<RepositoryFormData>({
    name: '',
    description: '',
    retain_repo_versions: null,
    remote: '',
    manifest_signing_service: '',
  });

  const remoteOptions = useMemo(() => remotes.map((r) => ({ label: r.name, value: r.pulp_href })), [remotes]);

  const versionsEndpoint = useMemo(() => {
    if (!repository) return href ? `${href.endsWith('/') ? href : `${href}/`}versions/` : '';
    return repository.versions_href || `${repository.pulp_href}versions/`;
  }, [href, repository]);

  const fetchRepository = async () => {
    if (!href) {
      setError('Missing repository href');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const repo = await containerService.repositories.read(href);
      setRepository(repo);
      setError(null);
    } catch {
      setError('Failed to load repository');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    if (!versionsEndpoint) return;

    try {
      setVersionsLoading(true);
      const response = await containerService.repositories.versions(versionsEndpoint);
      setVersions(response.results);
    } catch {
      setError('Failed to load repository versions');
    } finally {
      setVersionsLoading(false);
    }
  };

  const fetchRemotes = async () => {
    try {
      setRemotesLoading(true);
      const response = await containerService.remotes.list();
      setRemotes(response.results);
    } catch {
      // optional
    } finally {
      setRemotesLoading(false);
    }
  };

  useEffect(() => {
    void fetchRepository();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  useEffect(() => {
    void fetchVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionsEndpoint]);

  const openEdit = async () => {
    if (!repository) return;

    setFormData({
      name: repository.name,
      description: repository.description || '',
      retain_repo_versions: repository.retain_repo_versions ?? null,
      remote: repository.remote || '',
      manifest_signing_service: (repository as any).manifest_signing_service || '',
    });

    setEditOpen(true);
    await fetchRemotes();
  };

  const closeEdit = () => setEditOpen(false);

  const handleFormChange = (field: keyof RepositoryFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const submitEdit = async () => {
    if (!repository) return;

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description.trim() || null,
        retain_repo_versions: formData.retain_repo_versions,
        remote: formData.remote || null,
        manifest_signing_service: formData.manifest_signing_service || null,
      };

      await containerService.repositories.update(repository.pulp_href, payload);
      setSuccessMessage('Repository updated successfully');
      setEditOpen(false);
      await fetchRepository();
    } catch {
      setError('Failed to update repository');
    }
  };

  const syncRepository = async () => {
    if (!repository || !repository.remote) return;

    try {
      setSyncing(true);
      await containerService.repositories.sync(repository.pulp_href, { remote: repository.remote, mirror: false, signed_only: false });
      setSuccessMessage('Sync started');
    } catch {
      setError('Failed to start sync');
    } finally {
      setSyncing(false);
    }
  };

  const performDelete = async () => {
    if (!repository) return;

    try {
      await containerService.repositories.delete(repository.pulp_href);
      navigate('/container/repository');
    } catch {
      setError('Failed to delete repository');
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

  if (!repository) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error || 'Repository not found'}</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/container/repository')}>
          Back to Repositories
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Container Repository</Typography>
        <Box display="flex" gap={1} alignItems="center">
          {repository.remote ? (
            <Button variant="contained" onClick={syncRepository} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync'}
            </Button>
          ) : null}
          <IconButton color="primary" onClick={openEdit} title="Edit">
            <EditIcon />
          </IconButton>
          <IconButton color="error" onClick={() => setDeleteConfirmOpen(true)} title="Delete">
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          GET Result
        </Typography>
        <Box component="pre" sx={{ m: 0, overflowX: 'auto' }}>
          {JSON.stringify(repository, null, 2)}
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Repository Versions
        </Typography>
        {versionsLoading ? (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Number</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Href</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.pulp_href}>
                    <TableCell>{v.number ?? '-'}</TableCell>
                    <TableCell>{v.pulp_created || '-'}</TableCell>
                    <TableCell>{v.pulp_href}</TableCell>
                  </TableRow>
                ))}
                {versions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>No versions found</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={editOpen} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Repository</DialogTitle>
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
          <Button onClick={closeEdit}>Cancel</Button>
          <Button onClick={submitEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete repository "{repository.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={performDelete} color="error" variant="contained">
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
