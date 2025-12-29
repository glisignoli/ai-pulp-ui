import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { Remote } from '../../types/pulp';

export const FileRemoteDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const href = searchParams.get('href') || '';

  const [remote, setRemote] = useState<Remote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRemote = async () => {
      if (!href) {
        setError('Missing remote href');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await apiService.get<Remote>(href);
        setRemote(result);
        setError(null);
      } catch {
        setError('Failed to load remote');
      } finally {
        setLoading(false);
      }
    };

    void fetchRemote();
  }, [href]);

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!remote) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error || 'Remote not found'}</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/file/remote')}>
          Back to Remotes
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">File Remote</Typography>
        <Button variant="outlined" onClick={() => navigate('/file/remote')}>
          Back
        </Button>
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
          {JSON.stringify(remote, null, 2)}
        </Box>
      </Paper>
    </Container>
  );
};
