import React, { useState } from 'react';
import { Box, Button, CircularProgress, Container, Paper, TextField, Typography } from '@mui/material';
import { formatPulpApiError } from '../../services/api';
import { orphansService } from '../../services/orphans';
import { ForegroundSnackbar } from '../ForegroundSnackbar';

export const OrphansCleanup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [orphanProtectionTimeMinutes, setOrphanProtectionTimeMinutes] = useState<string>('');
  const [contentHrefs, setContentHrefs] = useState<string>('');

  const parseContentHrefs = (raw: string): string[] => {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  const handleCleanup = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const requestBody: { content_hrefs?: string[]; orphan_protection_time?: number } = {};

      const parsedContentHrefs = parseContentHrefs(contentHrefs);
      if (parsedContentHrefs.length > 0) {
        requestBody.content_hrefs = parsedContentHrefs;
      }

      const trimmedTime = orphanProtectionTimeMinutes.trim();
      if (trimmedTime !== '') {
        const parsed = Number(trimmedTime);
        if (!Number.isInteger(parsed) || parsed < 0) {
          setError('Orphan protection time must be a non-negative integer (minutes).');
          return;
        }
        requestBody.orphan_protection_time = parsed;
      }

      const result = await orphansService.cleanup(requestBody as any);
      void result;
      setSuccess('Orphans cleanup triggered successfully');
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to trigger orphans cleanup'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Orphans Cleanup
        </Typography>
        <Button variant="contained" onClick={handleCleanup} disabled={loading}>
          {loading ? 'Running…' : 'Run Cleanup'}
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Triggers Pulpcore orphan cleanup via <code>/pulp/api/v3/orphans/cleanup/</code>.
        </Typography>

        <TextField
          fullWidth
          label="Content hrefs"
          value={contentHrefs}
          onChange={(e) => setContentHrefs(e.target.value)}
          disabled={loading}
          multiline
          minRows={3}
          placeholder="One content href per line"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="number"
          label="Orphan protection time (minutes)"
          value={orphanProtectionTimeMinutes}
          onChange={(e) => setOrphanProtectionTimeMinutes(e.target.value)}
          inputProps={{ min: 0, step: 1 }}
          disabled={loading}
          sx={{ mb: 1 }}
        />
        <Typography variant="body2" sx={{ mb: 2 }}>
          The time in minutes for how long Pulp will hold orphan Content and Artifacts before they become candidates for deletion by this orphan cleanup task. This should ideally be longer than your longest running task otherwise any content created during that task could be cleaned up before the task finishes. If not specified, a default value is taken from the setting `ORPHAN_PROTECTION_TIME`.
        </Typography>

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
