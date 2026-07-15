import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  TextField,
} from '@mui/material';
import type { Distribution, Publication, Remote, Repository } from '../../types/pulp';
import type { PluginConfig } from '../../constants/plugins';
import { createPluginService } from '../../services/pluginCrud';
import { formatPulpApiError } from '../../services/api';
import { parsePulpLabelsJson, stripPulpOrigin } from '../../utils/pulp';
import { PluginFieldInputs, buildFieldPayload, initialFieldValues, type PluginFieldValues } from './pluginFields';

interface DistributionFormDialogProps {
  plugin: PluginConfig;
  open: boolean;
  /** Distribution being edited, or null to create a new one. */
  distribution: Distribution | null;
  onClose: () => void;
  /** Called after a successful save with a snackbar message. */
  onSaved: (message: string) => void;
}

export const DistributionFormDialog: React.FC<DistributionFormDialogProps> = ({
  plugin,
  open,
  distribution,
  onClose,
  onSaved,
}) => {
  const service = useMemo(() => createPluginService(plugin), [plugin]);
  const hasPublications = !!service.publications;
  const hasPullThrough = plugin.hasPullThrough;

  const [name, setName] = useState('');
  const [basePath, setBasePath] = useState('');
  const [repository, setRepository] = useState('');
  const [publication, setPublication] = useState('');
  const [remote, setRemote] = useState('');
  const [contentGuard, setContentGuard] = useState('');
  const [hidden, setHidden] = useState(false);
  const [pulpLabels, setPulpLabels] = useState('');
  const [extraValues, setExtraValues] = useState<PluginFieldValues>({});

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [remotesLoading, setRemotesLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const repositoryOptions = useMemo(
    () => repositories.map((r) => ({ label: r.name, value: r.pulp_href })),
    [repositories]
  );

  const remoteOptions = useMemo(
    () => remotes.map((r) => ({ label: r.name, value: r.pulp_href })),
    [remotes]
  );

  const publicationOptions = useMemo(
    () =>
      publications.map((p) => ({
        label: `${p.pulp_created ? new Date(p.pulp_created).toLocaleString() : ''} ${p.pulp_href}`.trim(),
        value: p.pulp_href,
      })),
    [publications]
  );

  useEffect(() => {
    if (!open) return;
    setName(distribution?.name ?? '');
    setBasePath(distribution?.base_path ?? '');
    setRepository(stripPulpOrigin(distribution?.repository || ''));
    setPublication(stripPulpOrigin(distribution?.publication || ''));
    setRemote(stripPulpOrigin(distribution?.remote || ''));
    setContentGuard(distribution?.content_guard || '');
    setHidden(distribution?.hidden ?? false);
    setPulpLabels(
      distribution?.pulp_labels && Object.keys(distribution.pulp_labels).length > 0
        ? JSON.stringify(distribution.pulp_labels, null, 2)
        : ''
    );
    setExtraValues(
      initialFieldValues(plugin.distributionFields, distribution as Record<string, unknown> | null)
    );
    setError(null);

    const fetchOptions = async () => {
      try {
        setRepositoriesLoading(true);
        const response = await service.repositories.list(0);
        setRepositories(response.results);
      } catch {
        // optional
      } finally {
        setRepositoriesLoading(false);
      }

      if (service.publications) {
        try {
          const response = await service.publications.list(0);
          setPublications(response.results);
        } catch {
          // optional
        }
      }

      if (hasPullThrough) {
        try {
          setRemotesLoading(true);
          const response = await service.remotes.list(0);
          setRemotes(response.results);
        } catch {
          // optional
        } finally {
          setRemotesLoading(false);
        }
      }
    };
    void fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, distribution, plugin]);

  const handleSubmit = async () => {
    const { labels, error: labelsError } = parsePulpLabelsJson(pulpLabels);
    if (labelsError) {
      setError(labelsError);
      return;
    }

    const { payload: extraPayload, error: extraError } = buildFieldPayload(
      plugin.distributionFields,
      extraValues
    );
    if (extraError) {
      setError(extraError);
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      base_path: basePath.trim(),
      repository: repository || null,
      content_guard: contentGuard.trim() || null,
      hidden,
      ...extraPayload,
    };

    if (hasPublications) {
      payload.publication = publication || null;
      // Pulp accepts only one of repository or publication.
      if (payload.repository && payload.publication) {
        payload.repository = null;
      }
    }

    if (hasPullThrough) {
      payload.remote = remote || null;
    }

    // Pulp accepts only one of repository or repository_version (container).
    if (payload.repository && payload.repository_version) {
      payload.repository_version = null;
    }

    if (labels && Object.keys(labels).length > 0) payload.pulp_labels = labels;

    try {
      setSaving(true);
      if (distribution) {
        await service.distributions.update(distribution.pulp_href, payload);
        onSaved('Distribution updated successfully');
      } else {
        await service.distributions.create(payload);
        onSaved('Distribution create task started');
      }
      onClose();
    } catch (err) {
      setError(formatPulpApiError(err, `Failed to ${distribution ? 'update' : 'create'} distribution`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{distribution ? 'Edit Distribution' : 'Create Distribution'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}

          <TextField
            label="Name"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Base Path"
            fullWidth
            required
            value={basePath}
            onChange={(e) => setBasePath(e.target.value)}
            helperText="The base (relative) path component of the published url"
          />
          <Autocomplete
            options={repositoryOptions}
            loading={repositoriesLoading}
            value={repositoryOptions.find((o) => o.value === repository) || null}
            onChange={(_, value) => setRepository(value?.value || '')}
            renderInput={(params) => <TextField {...params} label="Repository" />}
          />
          {hasPublications ? (
            <Autocomplete
              options={publicationOptions}
              value={publicationOptions.find((o) => o.value === publication) || null}
              onChange={(_, value) => setPublication(value?.value || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Publication"
                  helperText="Optional; if set, repository will be cleared"
                />
              )}
            />
          ) : null}
          {hasPullThrough ? (
            <Autocomplete
              options={remoteOptions}
              loading={remotesLoading}
              value={remoteOptions.find((o) => o.value === remote) || null}
              onChange={(_, value) => setRemote(value?.value || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Remote"
                  helperText="Remote used to fetch content on demand (pull-through caching)"
                />
              )}
            />
          ) : null}

          <PluginFieldInputs
            fields={plugin.distributionFields}
            values={extraValues}
            onChange={(key, value) => setExtraValues((prev) => ({ ...prev, [key]: value }))}
          />

          <TextField
            label="Content Guard (href)"
            fullWidth
            value={contentGuard}
            onChange={(e) => setContentGuard(e.target.value)}
            helperText="Optional href of a content guard restricting access to this distribution"
          />
          <FormControl fullWidth>
            <FormControlLabel
              control={<Checkbox checked={hidden} onChange={(e) => setHidden(e.target.checked)} />}
              label="Hidden"
            />
            <FormHelperText>Whether this distribution should be shown in the content app</FormHelperText>
          </FormControl>
          <TextField
            label="Pulp Labels (JSON)"
            fullWidth
            multiline
            minRows={3}
            value={pulpLabels}
            onChange={(e) => setPulpLabels(e.target.value)}
            helperText='Optional: JSON object of string-to-string labels, e.g. {"env":"dev"}'
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || !name.trim() || !basePath.trim()}
        >
          {distribution ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
