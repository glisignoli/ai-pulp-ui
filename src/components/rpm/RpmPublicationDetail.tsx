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
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService, formatPulpApiError } from '../../services/api';
import { Publication } from '../../types/pulp';

export const RpmPublicationDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const href = searchParams.get('href') || '';

  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fetchPublication = async () => {
    if (!href) {
      setError('Missing publication href');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const pub = await apiService.get<Publication>(href);
      setPublication(pub);
      setError(null);
    } catch {
      setError('Failed to load publication');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPublication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  const confirmDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
  };

  const executeDelete = async () => {
    if (!publication) return;

    try {
      await apiService.delete(publication.pulp_href);
      setSuccessMessage('Publication deleted successfully');
      setDeleteConfirmOpen(false);
      setTimeout(() => {
        navigate('/rpm/publication');
      }, 1500);
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to delete publication'));
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

  if (error && !publication) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/rpm/publication')}>
          Back to Publications
        </Button>
      </Container>
    );
  }

  if (!publication) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          Publication not found
        </Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/rpm/publication')}>
          Back to Publications
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Publication Details</Typography>
        <Box>
          <Button variant="outlined" sx={{ mr: 1 }} onClick={() => navigate('/rpm/publication')}>
            Back
          </Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            <DeleteIcon sx={{ mr: 1 }} /> Delete
          </Button>
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
          {JSON.stringify(publication, null, 2)}
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={cancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this publication? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancel</Button>
          <Button onClick={executeDelete} color="error" variant="contained">
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
