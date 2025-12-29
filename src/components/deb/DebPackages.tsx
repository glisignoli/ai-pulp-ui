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
import { Add as AddIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService, formatPulpApiError } from '../../services/api';
import { DebPackage, PulpListResponse } from '../../types/pulp';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

type TaskResponse = { task: string };

export const DebPackages: React.FC = () => {
  const navigate = useNavigate();

  const [packages, setPackages] = useState<DebPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [repositoryHref, setRepositoryHref] = useState('');
  const [distribution, setDistribution] = useState('');
  const [component, setComponent] = useState('');
  const [relativePath, setRelativePath] = useState('');
  const [artifactHref, setArtifactHref] = useState('');
  const [uploadHref, setUploadHref] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [pulpLabelsJson, setPulpLabelsJson] = useState('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<DebPackage>>('/content/deb/packages/?limit=100');
      setPackages(response?.results || []);
      setError(null);
    } catch {
      setError('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPackages();
  }, []);

  const openUpload = () => {
    setSelectedFile(null);
    setRepositoryHref('');
    setDistribution('');
    setComponent('');
    setRelativePath('');
    setArtifactHref('');
    setUploadHref('');
    setFileUrl('');
    setPulpLabelsJson('');
    setUploadOpen(true);
  };

  const closeUpload = () => {
    if (uploading) return;
    setUploadOpen(false);
  };

  const handleUpload = async () => {
    const trimmedRepositoryHref = repositoryHref.trim();
    const trimmedDistribution = distribution.trim();
    const trimmedComponent = component.trim();
    const trimmedRelativePath = relativePath.trim();
    const trimmedArtifactHref = artifactHref.trim();
    const trimmedUploadHref = uploadHref.trim();
    const trimmedFileUrl = fileUrl.trim();
    const trimmedPulpLabelsJson = pulpLabelsJson.trim();

    if (!trimmedDistribution || !trimmedComponent) {
      setSnackbarMessage('Distribution and component are required');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const sources = [
      trimmedArtifactHref ? 'artifact' : null,
      trimmedUploadHref ? 'upload' : null,
      trimmedFileUrl ? 'file_url' : null,
      selectedFile ? 'file' : null,
    ].filter(Boolean) as Array<'artifact' | 'upload' | 'file_url' | 'file'>;

    if (sources.length === 0) {
      setSnackbarMessage('Provide a file (or artifact/upload/file_url)');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (sources.length > 1) {
      setSnackbarMessage('Provide only one source: file, artifact, upload, or file_url');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    let pulpLabels: Record<string, string> | undefined;
    if (trimmedPulpLabelsJson) {
      try {
        const parsed = JSON.parse(trimmedPulpLabelsJson) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('pulp_labels must be a JSON object');
        }

        const record: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof value !== 'string') {
            throw new Error('pulp_labels values must be strings');
          }
          record[key] = value;
        }
        pulpLabels = record;
      } catch {
        setSnackbarMessage('Invalid pulp_labels JSON (must be an object of string values)');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
    }

    try {
      setUploading(true);
      const formData = new FormData();

      // /content/deb/packages/ is asynchronous (returns a task)
      const endpoint = '/content/deb/packages/';

      if (pulpLabels && Object.keys(pulpLabels).length > 0) {
        formData.append('pulp_labels', JSON.stringify(pulpLabels));
      }

      if (trimmedRepositoryHref) formData.append('repository', trimmedRepositoryHref);
      if (trimmedRelativePath) formData.append('relative_path', trimmedRelativePath);

      formData.append('distribution', trimmedDistribution);
      formData.append('component', trimmedComponent);

      if (sources[0] === 'file') {
        formData.append('file', selectedFile as File);
      } else if (sources[0] === 'artifact') {
        formData.append('artifact', trimmedArtifactHref);
      } else if (sources[0] === 'upload') {
        formData.append('upload', trimmedUploadHref);
      } else if (sources[0] === 'file_url') {
        formData.append('file_url', trimmedFileUrl);
      }

      const resp = await apiService.post<TaskResponse>(endpoint, formData);
      setSnackbarMessage(resp?.task ? 'Package upload task started' : 'Package upload request submitted');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setUploadOpen(false);
    } catch (error) {
      setSnackbarMessage(formatPulpApiError(error, 'Failed to upload package'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setUploading(false);
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
        <Typography variant="h4">DEB Packages</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openUpload}>
          Upload Package
        </Button>
      </Box>
      <ForegroundSnackbar
        open={!!error}
        message={error ?? ''}
        severity="error"
        onClose={() => setError(null)}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Package</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Architecture</TableCell>
              <TableCell>Section</TableCell>
              <TableCell>Maintainer</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No packages found
                </TableCell>
              </TableRow>
            ) : (
              packages.map((pkg) => (
                <TableRow key={pkg.pulp_href}>
                  <TableCell>{pkg.package}</TableCell>
                  <TableCell>{pkg.version}</TableCell>
                  <TableCell>{pkg.architecture}</TableCell>
                  <TableCell>{pkg.section || 'N/A'}</TableCell>
                  <TableCell>{pkg.maintainer || 'N/A'}</TableCell>
                  <TableCell>{pkg.pulp_created ? new Date(pkg.pulp_created).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/deb/content/packages/view?href=${encodeURIComponent(pkg.pulp_href)}`)}
                      aria-label="view"
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={uploadOpen} onClose={closeUpload} maxWidth="sm" fullWidth>
        <DialogTitle>Upload DEB Package</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button variant="outlined" component="label" disabled={uploading}>
              Choose DEB File
              <input
                type="file"
                hidden
                accept=".deb"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
              />
            </Button>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {selectedFile ? selectedFile.name : 'No file selected'}
            </Typography>

            <TextField
              label="Repository"
              fullWidth
              value={repositoryHref}
              onChange={(e) => setRepositoryHref(e.target.value)}
              disabled={uploading}
              helperText="Optional. If set, the package is added to that repository version."
            />

            <TextField
              label="Distribution"
              fullWidth
              value={distribution}
              onChange={(e) => setDistribution(e.target.value)}
              disabled={uploading}
              helperText='Required. APT distribution name (e.g. "stable" or "bullseye").'
            />
            <TextField
              label="Component"
              fullWidth
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              disabled={uploading}
              helperText='Required. APT component name (e.g. "main").'
            />

            <TextField
              label="Relative Path"
              fullWidth
              value={relativePath}
              onChange={(e) => setRelativePath(e.target.value)}
              disabled={uploading}
              helperText="Optional. Path relative to distribution base_path."
            />

            <TextField
              label="Artifact"
              fullWidth
              value={artifactHref}
              onChange={(e) => setArtifactHref(e.target.value)}
              disabled={uploading}
              helperText="Optional. Provide exactly one source: file, artifact, upload, or file_url."
            />
            <TextField
              label="Upload"
              fullWidth
              value={uploadHref}
              onChange={(e) => setUploadHref(e.target.value)}
              disabled={uploading}
              helperText="Optional. Uncommitted upload href."
            />
            <TextField
              label="File URL"
              fullWidth
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              disabled={uploading}
              helperText="Optional. URL that Pulp can download."
            />
            <TextField
              label="Pulp Labels (JSON)"
              fullWidth
              multiline
              minRows={3}
              value={pulpLabelsJson}
              onChange={(e) => setPulpLabelsJson(e.target.value)}
              disabled={uploading}
              helperText='Optional. JSON object, e.g. {"env":"dev"}.'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUpload} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} variant="contained" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};
