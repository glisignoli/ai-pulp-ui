import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  FormControlLabel,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import { formatPulpApiError } from '../../services/api';
import { repairService, type RepairResponse } from '../../services/repair';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

export const Repair: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [response, setResponse] = useState<RepairResponse | null>(null);
  const [verifyChecksums, setVerifyChecksums] = useState(true);

  const requestBody = {
    verify_checksums: verifyChecksums,
  };

  const handleRepair = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setResponse(null);

      const result = await repairService.repair(requestBody);

      setResponse(result);
      setSuccess('Repair triggered successfully');
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to trigger repair'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Repair
        </Typography>
        <Button variant="contained" onClick={handleRepair} disabled={loading}>
          {loading ? 'Running…' : 'Run Repair'}
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Triggers Pulpcore repair via <code>/pulp/api/v3/repair/</code>.
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={verifyChecksums}
              onChange={(e) => setVerifyChecksums(e.target.checked)}
              disabled={loading}
            />
          }
          label="Verify checksums"
          sx={{ mb: 1 }}
        />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}
      </Paper>

      <ForegroundSnackbar
        open={!!success}
        message={success ?? ''}
        severity="success"
        autoHideDuration={5000}
        onClose={() => setSuccess(null)}
      />

      <ForegroundSnackbar
        open={!!error}
        message={error ?? ''}
        severity="error"
        autoHideDuration={7000}
        onClose={() => setError(null)}
      />
    </Container>
  );
};
