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
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { PulpListResponse, RpmPackage } from '../../types/pulp';

export const RpmPackages: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<RpmPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<RpmPackage>>('/content/rpm/packages/?limit=100');
      setPackages(response?.results || []);
      setError(null);
    } catch (err) {
      setError('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openUpload = () => {
    setSelectedFile(null);
    setUploadOpen(true);
  };

  const closeUpload = () => {
    if (uploading) return;
    setUploadOpen(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setSnackbarMessage('Please select an RPM file to upload');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      await apiService.post<RpmPackage>('/content/rpm/packages/upload/', formData);

      setSnackbarMessage('Package uploaded successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setUploadOpen(false);
      await fetchPackages();
    } catch (err) {
      setSnackbarMessage('Failed to upload package');
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
        <Typography variant="h4">RPM Packages</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openUpload}>
          Upload Package
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Release</TableCell>
              <TableCell>Arch</TableCell>
              <TableCell>Summary</TableCell>
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
                  <TableCell>{pkg.name}</TableCell>
                  <TableCell>{pkg.version}</TableCell>
                  <TableCell>{pkg.release}</TableCell>
                  <TableCell>{pkg.arch}</TableCell>
                  <TableCell>{pkg.summary || 'N/A'}</TableCell>
                  <TableCell>{pkg.pulp_created ? new Date(pkg.pulp_created).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() =>
                        navigate(`/rpm/content/packages/view?href=${encodeURIComponent(pkg.pulp_href)}`)
                      }
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
        <DialogTitle>Upload RPM Package</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Button variant="outlined" component="label" disabled={uploading}>
              Choose RPM File
              <input
                type="file"
                hidden
                accept=".rpm"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
              />
            </Button>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {selectedFile ? selectedFile.name : 'No file selected'}
            </Typography>
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
