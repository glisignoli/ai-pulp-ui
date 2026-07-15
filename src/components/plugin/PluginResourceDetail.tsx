import React, { useEffect, useMemo, useState } from 'react';
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
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Distribution, Remote, Repository, RepositoryVersion } from '../../types/pulp';
import type { PluginConfig } from '../../constants/plugins';
import { pluginRoutePaths } from '../../constants/plugins';
import { createPluginService } from '../../services/pluginCrud';
import { formatPulpApiError } from '../../services/api';
import { RemoteFormDialog } from './RemoteFormDialog';
import { RepositoryFormDialog } from './RepositoryFormDialog';
import { DistributionFormDialog } from './DistributionFormDialog';

export type PluginResource = 'repository' | 'remote' | 'distribution' | 'publication';

const RESOURCE_LABELS: Record<PluginResource, string> = {
  repository: 'Repository',
  remote: 'Remote',
  distribution: 'Distribution',
  publication: 'Publication',
};

interface PluginResourceDetailProps {
  plugin: PluginConfig;
  resource: PluginResource;
}

export const PluginResourceDetail: React.FC<PluginResourceDetailProps> = ({ plugin, resource }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const href = searchParams.get('href') || '';

  const service = useMemo(() => createPluginService(plugin), [plugin]);
  const paths = useMemo(() => pluginRoutePaths(plugin), [plugin]);

  const listPath = paths[resource];
  const resourceLabel = RESOURCE_LABELS[resource];

  const [item, setItem] = useState<Record<string, any> | null>(null);
  const [versions, setVersions] = useState<RepositoryVersion[]>([]);

  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const read = async (resourceHref: string): Promise<Record<string, any>> => {
    switch (resource) {
      case 'repository':
        return service.repositories.read(resourceHref);
      case 'remote':
        return service.remotes.read(resourceHref);
      case 'distribution':
        return service.distributions.read(resourceHref);
      case 'publication':
        if (!service.publications) throw new Error(`${plugin.label} does not support publications`);
        return service.publications.read(resourceHref);
    }
  };

  const fetchItem = async () => {
    if (!href) {
      setError(`Missing ${resource} href`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await read(href);
      setItem(result);
      setError(null);

      if (resource === 'repository') {
        const repo = result as Repository;
        const versionsEndpoint =
          repo.versions_href || `${href.endsWith('/') ? href : `${href}/`}versions/`;
        try {
          setVersionsLoading(true);
          const response = await service.repositories.versions(versionsEndpoint);
          setVersions(response.results);
        } catch {
          setError('Failed to load repository versions');
        } finally {
          setVersionsLoading(false);
        }
      }
    } catch {
      setError(`Failed to load ${resource}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href, plugin, resource]);

  const syncRepository = async () => {
    if (!item || !item.remote) return;

    try {
      setSyncing(true);
      await service.repositories.sync(item.pulp_href, { remote: item.remote });
      setSuccessMessage('Sync started');
    } catch (error) {
      setError(formatPulpApiError(error, 'Failed to start sync'));
    } finally {
      setSyncing(false);
    }
  };

  const performDelete = async () => {
    if (!item) return;

    try {
      switch (resource) {
        case 'repository':
          await service.repositories.delete(item.pulp_href);
          break;
        case 'remote':
          await service.remotes.delete(item.pulp_href);
          break;
        case 'distribution':
          await service.distributions.delete(item.pulp_href);
          break;
        case 'publication':
          await service.publications?.delete(item.pulp_href);
          break;
      }
      navigate(listPath);
    } catch (error) {
      setError(formatPulpApiError(error, `Failed to delete ${resource}`));
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

  if (!item) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error || `${resourceLabel} not found`}</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate(listPath)}>
          Back to {resourceLabel}s
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {plugin.label} {resourceLabel}
        </Typography>
        <Box display="flex" gap={1} alignItems="center">
          <IconButton color="primary" onClick={() => navigate(listPath)} title="Back">
            <ArrowBackIcon />
          </IconButton>
          {resource === 'repository' && plugin.hasSync && item.remote ? (
            <Button variant="contained" onClick={syncRepository} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync'}
            </Button>
          ) : null}
          {resource !== 'publication' ? (
            <IconButton color="primary" onClick={() => setEditOpen(true)} title="Edit">
              <EditIcon />
            </IconButton>
          ) : null}
          <IconButton color="error" onClick={() => setDeleteConfirmOpen(true)} title="Delete">
            <DeleteIcon />
          </IconButton>
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
        <Box component="pre" sx={{ m: 0, overflowX: 'auto' }}>
          {JSON.stringify(item, null, 2)}
        </Box>
      </Paper>

      {resource === 'repository' ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Repository Versions
          </Typography>
          {versionsLoading ? (
            <Box display="flex" justifyContent="center" my={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Number</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Href</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((v) => (
                    <TableRow key={v.pulp_href}>
                      <TableCell>{v.number ?? '-'}</TableCell>
                      <TableCell>{v.pulp_created || '-'}</TableCell>
                      <TableCell>{v.pulp_href}</TableCell>
                    </TableRow>
                  ))}
                  {versions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>No versions found</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      ) : null}

      {resource === 'repository' ? (
        <RepositoryFormDialog
          plugin={plugin}
          open={editOpen}
          repository={item as Repository}
          onClose={() => setEditOpen(false)}
          onSaved={(message) => {
            setSuccessMessage(message);
            void fetchItem();
          }}
        />
      ) : null}
      {resource === 'remote' ? (
        <RemoteFormDialog
          plugin={plugin}
          open={editOpen}
          remote={item as Remote}
          onClose={() => setEditOpen(false)}
          onSaved={(message) => {
            setSuccessMessage(message);
            void fetchItem();
          }}
        />
      ) : null}
      {resource === 'distribution' ? (
        <DistributionFormDialog
          plugin={plugin}
          open={editOpen}
          distribution={item as Distribution}
          onClose={() => setEditOpen(false)}
          onSaved={(message) => {
            setSuccessMessage(message);
            void fetchItem();
          }}
        />
      ) : null}

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {resource}
            {item.name ? ` "${item.name}"` : ''}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={performDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Container>
  );
};
