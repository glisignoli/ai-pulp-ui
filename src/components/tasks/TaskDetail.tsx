import React, { useEffect, useMemo, useState } from 'react';
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

export const TaskDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const href = searchParams.get('href') || '';

  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prettyJson = useMemo(() => {
    if (!task) return '';
    try {
      return JSON.stringify(task, null, 2);
    } catch {
      return String(task);
    }
  }, [task]);

  const fetchTask = async () => {
    if (!href) {
      setError('Missing task href');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const t = await apiService.get<any>(href);
      setTask(t);
      setError(null);
    } catch {
      setError('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (error && !task) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/tasks')}>
          Back to Tasks
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Task Details{task?.name ? `: ${task.name}` : ''}
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/tasks')}>
          Back
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
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
          {prettyJson}
        </Box>
      </Paper>
    </Container>
  );
};
