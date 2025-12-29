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
  MenuItem,
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
import { Add as AddIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { PulpListResponse, Publication, Repository } from '../../types/pulp';

interface PublicationFormData {
  repository: string;
}

export const FilePublication: React.FC = () => {
  const navigate = useNavigate();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<PublicationFormData>({ repository: '' });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [publicationToDelete, setPublicationToDelete] = useState<Publication | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pubRes, repoRes] = await Promise.all([
        apiService.get<PulpListResponse<Publication>>('/publications/file/file/'),
        apiService.get<PulpListResponse<Repository>>('/repositories/file/file/'),
      ]);

      setPublications(pubRes.results);
      setRepositories(repoRes.results);
      setError(null);
    } catch {
      setError('Failed to load publications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleOpenDialog = () => {
    setFormData({ repository: '' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => setOpenDialog(false);

  const handleSubmit = async () => {
    try {
      await apiService.post('/publications/file/file/', { repository: formData.repository });
      setSuccessMessage('Publication creation task started');
      handleCloseDialog();
      await fetchData();
    } catch {
      setError('Failed to create publication');
    }
  };

  const handleDeleteClick = (publication: Publication) => {
    setPublicationToDelete(publication);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!publicationToDelete) return;

    try {
      await apiService.delete(publicationToDelete.pulp_href);
      setSuccessMessage('Publication delete task started');
      setDeleteConfirmOpen(false);
      setPublicationToDelete(null);
      await fetchData();
    } catch {
      setError('Failed to delete publication');
      setDeleteConfirmOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setPublicationToDelete(null);
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
        <Typography variant="h4">File Publications</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          Create Publication
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
              <TableCell>Href</TableCell>
              <TableCell>Repository</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {publications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No publications found
                </TableCell>
              </TableRow>
            ) : (
              publications.map((publication) => (
                <TableRow key={publication.pulp_href}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{publication.pulp_href}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{publication.repository}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/file/publication/view?href=${encodeURIComponent(publication.pulp_href)}`)}
                      aria-label="view"
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDeleteClick(publication)} aria-label="delete" title="Delete">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create Publication</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Repository"
              fullWidth
              value={formData.repository}
              onChange={(e) => setFormData({ repository: e.target.value })}
              required
              helperText="Select the repository to publish"
            >
              {repositories.map((repo) => (
                <MenuItem key={repo.pulp_href} value={repo.pulp_href}>
                  {repo.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.repository}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Publication</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this publication?
          <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 1, fontSize: '0.8rem' }}>
            {publicationToDelete?.pulp_href}
          </Box>
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};
