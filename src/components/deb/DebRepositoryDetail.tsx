import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
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
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { PulpListResponse, Remote, Repository, RepositoryVersion } from '../../types/pulp';

interface RepositoryFormData {
  name: string;
  description: string;
  retain_repo_versions: number | null;
  autopublish: boolean;
  publish_upstream_release_fields: boolean;
  signing_service: string;
  remote: string;
}

export const DebRepositoryDetail: React.FC = () => {
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
    autopublish: false,
    publish_upstream_release_fields: true,
    signing_service: '',
    remote: '',
  });

  const versionsEndpoint = useMemo(() => {
    if (!repository) return href ? `${href}versions/` : '';
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
      const repo = await apiService.get<Repository>(href);
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
      const response = await apiService.get<PulpListResponse<RepositoryVersion>>(versionsEndpoint);
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
      const response = await apiService.get<PulpListResponse<Remote>>('/remotes/deb/apt/');
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
      autopublish: repository.autopublish ?? false,
      publish_upstream_release_fields: (repository as any).publish_upstream_release_fields ?? true,
      signing_service: (repository as any).signing_service || '',
      remote: repository.remote || '',
    });

    setEditOpen(true);
    await fetchRemotes();
  };

  const submitEdit = async () => {
    if (!repository) return;

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        retain_repo_versions: formData.retain_repo_versions || undefined,
        autopublish: formData.autopublish,
        publish_upstream_release_fields: formData.publish_upstream_release_fields,
      };

      if (formData.remote) payload.remote = formData.remote;
      if (formData.signing_service) payload.signing_service = formData.signing_service;

      await apiService.put(repository.pulp_href, payload);
      setSuccessMessage('Repository updated successfully');
      setEditOpen(false);
      await fetchRepository();
    } catch {
      setError('Failed to update repository');
    }
  };

  const syncRepository = async () => {
    if (!repository) return;
    const remote = repository.remote || undefined;
    if (!remote) return;

    try {
      setSyncing(true);
      await apiService.post(`${repository.pulp_href}sync/`, { remote });
      setSuccessMessage('Sync started successfully');
    } catch {
      setError('Failed to sync repository');
    } finally {
      setSyncing(false);
    }
  };

  const performDelete = async () => {
    if (!repository) return;

    try {
      await apiService.delete(repository.pulp_href);
      navigate('/deb/repository');
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
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/deb/repository')}>
          Back to Repositories
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">DEB Repository</Typography>
        <Box display="flex" gap={1} alignItems="center">
          {repository.remote ? (
            <Button variant="contained" color="primary" onClick={syncRepository} disabled={syncing}>
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
        <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(repository, null, 2)}
        </Box>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Repository Versions
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Number</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>HREF</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {versionsLoading ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : versions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No repository versions found
                </TableCell>
              </TableRow>
            ) : (
              versions.map((v) => (
                <TableRow key={v.pulp_href}>
                  <TableCell>{v.number ?? 'N/A'}</TableCell>
                  <TableCell>{v.pulp_created || 'N/A'}</TableCell>
                  <TableCell>{v.pulp_href}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Repository</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Name" fullWidth value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
            <TextField
              label="Description"
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            />
            <TextField
              label="Retain Repo Versions"
              type="number"
              fullWidth
              value={formData.retain_repo_versions ?? ''}
              onChange={(e) => setFormData((p) => ({ ...p, retain_repo_versions: e.target.value ? Number(e.target.value) : null }))}
            />

            <Autocomplete
              options={remotes}
              loading={remotesLoading}
              getOptionLabel={(r) => r.name}
              value={remotes.find((r) => r.pulp_href === formData.remote) || null}
              onChange={(_, value) => setFormData((p) => ({ ...p, remote: value?.pulp_href || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Remote"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {remotesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <TextField
              label="Signing Service (href)"
              fullWidth
              value={formData.signing_service}
              onChange={(e) => setFormData((p) => ({ ...p, signing_service: e.target.value }))}
            />

            <FormControlLabel
              control={<Checkbox checked={formData.autopublish} onChange={(e) => setFormData((p) => ({ ...p, autopublish: e.target.checked }))} />}
              label="Autopublish"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.publish_upstream_release_fields}
                  onChange={(e) => setFormData((p) => ({ ...p, publish_upstream_release_fields: e.target.checked }))}
                />
              }
              label="Publish Upstream Release Fields"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={submitEdit} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete repository "{repository.name}"?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={performDelete} color="error" variant="contained">
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
