import React, { useEffect, useMemo, useState } from 'react';
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
  Autocomplete,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Checkbox,
  MenuItem,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService, formatPulpApiError } from '../../services/api';
import { PulpListResponse, Remote, Repository, RepositoryVersion } from '../../types/pulp';

interface RepositoryFormData {
  name: string;
  description: string;
  retain_repo_versions: number | null;
  autopublish: boolean;
  retain_package_versions: number | null;
  checksum_type: string;
  repo_config: string;
  compression_type: string;
  layout: string;
  remote: string;
}

export const RpmRepositoryDetail: React.FC = () => {
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
    retain_package_versions: null,
    checksum_type: '',
    repo_config: '',
    compression_type: '',
    layout: '',
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
    } catch (err) {
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
    } catch (err) {
      setError('Failed to load repository versions');
    } finally {
      setVersionsLoading(false);
    }
  };

  const fetchRemotes = async () => {
    try {
      setRemotesLoading(true);
      const response = await apiService.get<PulpListResponse<Remote>>('/remotes/rpm/rpm/');
      setRemotes(response.results);
    } catch (err) {
      // Optional UX: ignore, remote selection will be empty
    } finally {
      setRemotesLoading(false);
    }
  };

  useEffect(() => {
    fetchRepository();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  useEffect(() => {
    fetchVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionsEndpoint]);

  const openEdit = async () => {
    if (!repository) return;

    setFormData({
      name: repository.name,
      description: repository.description || '',
      retain_repo_versions: repository.retain_repo_versions ?? null,
      autopublish: repository.autopublish ?? false,
      retain_package_versions: repository.retain_package_versions ?? null,
      checksum_type: repository.checksum_type || '',
      repo_config: repository.repo_config ? JSON.stringify(repository.repo_config, null, 2) : '',
      compression_type: repository.compression_type || '',
      layout: repository.layout || '',
      remote: repository.remote || '',
    });
    setEditOpen(true);
    await fetchRemotes();
  };

  const closeEdit = () => {
    setEditOpen(false);
  };

  const handleFormChange = (field: keyof RepositoryFormData, value: string | number | boolean | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value as any,
    }));
  };

  const submitEdit = async () => {
    if (!repository) return;

    try {
      const retainRepoVersionsInvalid = formData.retain_repo_versions !== null && formData.retain_repo_versions < 0;
      const retainPackageVersionsInvalid =
        formData.retain_package_versions !== null && formData.retain_package_versions < 0;

      if (retainRepoVersionsInvalid) {
        setError('Retain Repository Versions must be >= 0');
        return;
      }
      if (retainPackageVersionsInvalid) {
        setError('Retain Package Versions must be >= 0');
        return;
      }

      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        retain_repo_versions: formData.retain_repo_versions ?? undefined,
        autopublish: formData.autopublish,
        retain_package_versions: formData.retain_package_versions ?? undefined,
      };

      if (formData.repo_config.trim()) {
        try {
          payload.repo_config = JSON.parse(formData.repo_config);
        } catch {
          setError('Invalid JSON in repo_config');
          return;
        }
      }

      if (formData.remote) payload.remote = formData.remote;
      if (formData.checksum_type) payload.checksum_type = formData.checksum_type;
      if (formData.compression_type) payload.compression_type = formData.compression_type;
      if (formData.layout) payload.layout = formData.layout;

      await apiService.put(repository.pulp_href, payload);
      setSuccessMessage('Repository updated successfully');
      setEditOpen(false);
      await fetchRepository();
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to update repository'));
    }
  };

  const confirmDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
  };

  const performDelete = async () => {
    if (!repository) return;
    try {
      await apiService.delete(repository.pulp_href);
      navigate('/rpm/repository');
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to delete repository'));
      setDeleteConfirmOpen(false);
    }
  };

  const syncRepository = async () => {
    if (!repository || !repository.remote) return;
    try {
      setSyncing(true);
      await apiService.post(`${repository.pulp_href}sync/`, { remote: repository.remote });
      setSuccessMessage('Sync started successfully');
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to sync repository'));
    } finally {
      setSyncing(false);
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
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/rpm/repository')}>
          Back to Repositories
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">RPM Repository</Typography>
        <Box display="flex" gap={1} alignItems="center">
          {repository.remote ? (
            <Button
              variant="contained"
              color="primary"
              onClick={syncRepository}
              disabled={syncing}
            >
              {syncing ? 'Syncing…' : 'Sync'}
            </Button>
          ) : null}
          <IconButton color="primary" onClick={openEdit} title="Edit">
            <EditIcon />
          </IconButton>
          <IconButton color="error" onClick={confirmDelete} title="Delete">
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Repository</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Name" fullWidth required value={formData.name} disabled />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />
            <Autocomplete
              options={remotes}
              getOptionLabel={(option) => option.name}
              value={remotes.find((r) => r.pulp_href === formData.remote) || null}
              onChange={(_, newValue) => handleFormChange('remote', newValue?.pulp_href || '')}
              loading={remotesLoading}
              renderInput={(params) => (
                <TextField {...params} label="Remote" helperText="Optional: Select a remote repository to sync content from" />
              )}
            />
            <TextField
              label="Retain Repository Versions"
              fullWidth
              type="number"
              value={formData.retain_repo_versions ?? ''}
              onChange={(e) =>
                handleFormChange('retain_repo_versions', e.target.value ? parseInt(e.target.value) : null)
              }
              error={formData.retain_repo_versions !== null && formData.retain_repo_versions < 0}
              helperText={
                formData.retain_repo_versions !== null && formData.retain_repo_versions < 0
                  ? 'Must be >= 0'
                  : 'Number of repository versions to retain (leave empty to retain all versions)'
              }
            />
            <TextField
              label="Retain Package Versions"
              fullWidth
              type="number"
              value={formData.retain_package_versions ?? ''}
              onChange={(e) =>
                handleFormChange('retain_package_versions', e.target.value ? parseInt(e.target.value) : null)
              }
              error={formData.retain_package_versions !== null && formData.retain_package_versions < 0}
              helperText={
                formData.retain_package_versions !== null && formData.retain_package_versions < 0
                  ? 'Must be >= 0'
                  : 'Number of versions of each package to keep (0 = keep all)'
              }
            />
            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.autopublish}
                    onChange={(e) => handleFormChange('autopublish', e.target.checked)}
                  />
                }
                label="Auto-publish"
              />
              <FormHelperText>Automatically create publications for new repository versions</FormHelperText>
            </FormControl>
            <TextField
              label="Checksum Type"
              fullWidth
              select
              value={formData.checksum_type}
              onChange={(e) => handleFormChange('checksum_type', e.target.value)}
              helperText="Preferred checksum type during repo publish"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="unknown">Unknown</MenuItem>
              <MenuItem value="md5">MD5</MenuItem>
              <MenuItem value="sha1">SHA1</MenuItem>
              <MenuItem value="sha224">SHA224</MenuItem>
              <MenuItem value="sha256">SHA256</MenuItem>
              <MenuItem value="sha384">SHA384</MenuItem>
              <MenuItem value="sha512">SHA512</MenuItem>
            </TextField>
            <TextField
              label="Repo Config (JSON)"
              fullWidth
              multiline
              rows={4}
              value={formData.repo_config}
              onChange={(e) => handleFormChange('repo_config', e.target.value)}
              helperText="Optional: Repository configuration as a JSON document"
            />
            <TextField
              label="Compression Type"
              fullWidth
              select
              value={formData.compression_type}
              onChange={(e) => handleFormChange('compression_type', e.target.value)}
              helperText="Compression type for metadata files"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="zstd">ZSTD</MenuItem>
              <MenuItem value="gz">GZIP</MenuItem>
            </TextField>
            <TextField
              label="Layout"
              fullWidth
              select
              value={formData.layout}
              onChange={(e) => handleFormChange('layout', e.target.value)}
              helperText="Package layout within published repository"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="nested_alphabetically">Nested Alphabetically</MenuItem>
              <MenuItem value="flat">Flat</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Cancel</Button>
          <Button onClick={submitEdit} variant="contained" color="primary" disabled={!formData.name.trim()}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={cancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the repository "{repository.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancel</Button>
          <Button onClick={performDelete} variant="contained" color="error">
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
