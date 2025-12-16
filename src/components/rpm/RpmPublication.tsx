import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  FormControlLabel,
  Checkbox,
  Typography,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Publication, PulpListResponse, Repository } from '../../types/pulp';
import { ApiService } from '../../services/api';

interface PublicationFormData {
  repository_version: string;
  repository: string;
  checkpoint: boolean;
  checksum_type: 'unknown' | 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512';
  repo_config: string;
  compression_type: 'zstd' | 'gz';
  layout: 'nested_alphabetically' | 'flat';
}

const RpmPublication: React.FC = () => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryMap, setRepositoryMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const [formData, setFormData] = useState<PublicationFormData>({
    repository_version: '',
    repository: '',
    checkpoint: false,
    checksum_type: 'sha256',
    repo_config: '',
    compression_type: 'zstd',
    layout: 'nested_alphabetically',
  });

  const apiService = ApiService.getInstance();

  useEffect(() => {
    loadPublications();
    loadRepositories();
  }, []);

  const loadPublications = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<Publication>>('/pulp/api/v3/publications/rpm/rpm/');
      setPublications(response?.results || []);
    } catch (error) {
      console.error('Failed to load publications:', error);
      setSnackbarMessage('Failed to load publications');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const loadRepositories = async () => {
    try {
      const response = await apiService.get<PulpListResponse<Repository>>('/pulp/api/v3/repositories/rpm/rpm/');
      const repos = response?.results || [];
      setRepositories(repos);
      
      // Create a map of repository href to name for easy lookup
      const repoMap = new Map<string, string>();
      repos.forEach(repo => {
        repoMap.set(repo.pulp_href, repo.name);
      });
      setRepositoryMap(repoMap);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    }
  };

  const handleCreateClick = () => {
    setFormData({
      repository_version: '',
      repository: '',
      checkpoint: false,
      checksum_type: 'sha256',
      repo_config: '',
      compression_type: 'zstd',
      layout: 'nested_alphabetically',
    });
    setOpenCreateDialog(true);
  };

  const handleDeleteClick = (publication: Publication) => {
    setSelectedPublication(publication);
    setOpenDeleteDialog(true);
  };

  const handleFormChange = (field: keyof PublicationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const payload: any = {
        checkpoint: formData.checkpoint,
        checksum_type: formData.checksum_type,
        compression_type: formData.compression_type,
        layout: formData.layout,
      };

      // Add repository or repository_version (at least one is required)
      if (formData.repository) {
        payload.repository = formData.repository;
      }
      if (formData.repository_version) {
        payload.repository_version = formData.repository_version;
      }

      // Add repo_config if provided
      if (formData.repo_config) {
        try {
          payload.repo_config = JSON.parse(formData.repo_config);
        } catch (e) {
          setSnackbarMessage('Invalid JSON in repo_config');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
      }

      await apiService.post('/pulp/api/v3/publications/rpm/rpm/', payload);
      setSnackbarMessage('Publication created successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setOpenCreateDialog(false);
      loadPublications();
    } catch (error: any) {
      console.error('Failed to create publication:', error);
      setSnackbarMessage(error.message || 'Failed to create publication');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedPublication) return;

    try {
      await apiService.delete(selectedPublication.pulp_href);
      setSnackbarMessage('Publication deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setOpenDeleteDialog(false);
      loadPublications();
    } catch (error: any) {
      console.error('Failed to delete publication:', error);
      setSnackbarMessage(error.message || 'Failed to delete publication');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          RPM Publications
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
        >
          Create Publication
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Repository</TableCell>
              <TableCell>Checksum Type</TableCell>
              <TableCell>Compression</TableCell>
              <TableCell>Layout</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {publications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No publications found
                </TableCell>
              </TableRow>
            ) : (
              publications.map((pub) => (
                <TableRow key={pub.pulp_href}>
                  <TableCell>{pub.repository ? repositoryMap.get(pub.repository) || 'N/A' : 'N/A'}</TableCell>
                  <TableCell>{pub.checksum_type || 'N/A'}</TableCell>
                  <TableCell>{pub.compression_type || 'N/A'}</TableCell>
                  <TableCell>{pub.layout || 'N/A'}</TableCell>
                  <TableCell>{pub.pulp_created ? new Date(pub.pulp_created).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(pub)}
                      aria-label="delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create RPM Publication</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {/* Basic Info Section */}
            <Typography variant="h6">Basic Info</Typography>
            <Divider />

            <FormControl fullWidth>
              <InputLabel>Repository *</InputLabel>
              <Select
                value={formData.repository}
                onChange={(e) => handleFormChange('repository', e.target.value)}
                label="Repository *"
              >
                {repositories.map((repo) => (
                  <MenuItem key={repo.pulp_href} value={repo.pulp_href}>
                    {repo.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Repository Version (optional)"
              value={formData.repository_version}
              onChange={(e) => handleFormChange('repository_version', e.target.value)}
              helperText="If not provided, the latest version will be used"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.checkpoint}
                  onChange={(e) => handleFormChange('checkpoint', e.target.checked)}
                />
              }
              label="Checkpoint"
            />

            {/* Checksum Settings Section */}
            <Typography variant="h6" sx={{ mt: 2 }}>Checksum Settings</Typography>
            <Divider />

            <FormControl fullWidth>
              <InputLabel>Checksum Type</InputLabel>
              <Select
                value={formData.checksum_type}
                onChange={(e) => handleFormChange('checksum_type', e.target.value)}
                label="Checksum Type"
              >
                <MenuItem value="unknown">Unknown</MenuItem>
                <MenuItem value="md5">MD5</MenuItem>
                <MenuItem value="sha1">SHA1</MenuItem>
                <MenuItem value="sha224">SHA224</MenuItem>
                <MenuItem value="sha256">SHA256</MenuItem>
                <MenuItem value="sha384">SHA384</MenuItem>
                <MenuItem value="sha512">SHA512</MenuItem>
              </Select>
            </FormControl>

            {/* Repository Settings Section */}
            <Typography variant="h6" sx={{ mt: 2 }}>Repository Settings</Typography>
            <Divider />

            <TextField
              fullWidth
              label="Repo Config (JSON)"
              value={formData.repo_config}
              onChange={(e) => handleFormChange('repo_config', e.target.value)}
              multiline
              rows={4}
              helperText="JSON document describing the config.repo file"
            />

            <FormControl fullWidth>
              <InputLabel>Compression Type</InputLabel>
              <Select
                value={formData.compression_type}
                onChange={(e) => handleFormChange('compression_type', e.target.value)}
                label="Compression Type"
              >
                <MenuItem value="zstd">ZSTD</MenuItem>
                <MenuItem value="gz">GZ</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Layout</InputLabel>
              <Select
                value={formData.layout}
                onChange={(e) => handleFormChange('layout', e.target.value)}
                label="Layout"
              >
                <MenuItem value="nested_alphabetically">Nested Alphabetically</MenuItem>
                <MenuItem value="flat">Flat</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this publication?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RpmPublication;
