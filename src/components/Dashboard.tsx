import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { formatPulpApiError } from '../services/api';
import { statusService } from '../services/status';
import type { PulpStatusResponse } from '../types/status';

export const Dashboard: React.FC = () => {
  const [status, setStatus] = useState<PulpStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await statusService.read();
        if (cancelled) return;
        setStatus(data);
      } catch (e) {
        if (cancelled) return;
        setError(formatPulpApiError(e, 'Failed to load Pulp status.'));
        setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const versions = useMemo(() => status?.versions ?? [], [status]);
  const onlineWorkers = useMemo(() => status?.online_workers ?? [], [status]);
  const onlineApiApps = useMemo(() => status?.online_api_apps ?? [], [status]);
  const onlineContentApps = useMemo(() => status?.online_content_apps ?? [], [status]);

  const statusChip = (ok: boolean, okLabel = 'Connected', badLabel = 'Disconnected') => (
    <Chip
      size="small"
      color={ok ? 'success' : 'error'}
      variant="outlined"
      label={ok ? okLabel : badLabel}
    />
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Loading status…
              </Typography>
            </Box>
          )}

          {!loading && error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && status && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Connections
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">Database</Typography>
                    {statusChip(status.database_connection?.connected ?? false)}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">Redis</Typography>
                    {statusChip(status.redis_connection?.connected ?? false)}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">Domain</Typography>
                    {statusChip(status.domain_enabled ?? false, 'Enabled', 'Disabled')}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Storage
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">Total</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {status.storage?.total ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">Used</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {status.storage?.used ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">Free</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {status.storage?.free ?? 0}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Content Settings
                  </Typography>
                  <Typography variant="body2">Origin</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {status.content_settings?.content_origin ?? ''}
                  </Typography>
                  <Typography variant="body2">Path Prefix</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {status.content_settings?.content_path_prefix ?? ''}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Online Components
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      Workers: {onlineWorkers.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      API apps: {onlineApiApps.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Content apps: {onlineContentApps.length}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Versions
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Component</TableCell>
                        <TableCell>Version</TableCell>
                        <TableCell>Package</TableCell>
                        <TableCell>Module</TableCell>
                        <TableCell align="right">Domain Compatible</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {versions.map((v) => (
                        <TableRow key={`${v.component}:${v.version}:${v.package}`}> 
                          <TableCell>{v.component}</TableCell>
                          <TableCell>{v.version}</TableCell>
                          <TableCell>{v.package}</TableCell>
                          <TableCell>{v.module}</TableCell>
                          <TableCell align="right">{statusChip(v.domain_compatible, 'Yes', 'No')}</TableCell>
                        </TableRow>
                      ))}
                      {versions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Typography variant="body2" color="text.secondary">
                              No version information available.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Paper>
      </Box>
    </Container>
  );
};
