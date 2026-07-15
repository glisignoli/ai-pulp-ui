import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import type { Remote, Repository } from '../../types/pulp';
import type { PluginConfig } from '../../constants/plugins';
import { createPluginService } from '../../services/pluginCrud';
import { formatPulpApiError } from '../../services/api';
import { parsePulpLabelsJson } from '../../utils/pulp';
import { PluginFieldInputs, buildFieldPayload, initialFieldValues, type PluginFieldValues } from './pluginFields';

interface RepositoryFormDialogProps {
  plugin: PluginConfig;
  open: boolean;
  /** Repository being edited, or null to create a new one. */
  repository: Repository | null;
  onClose: () => void;
  /** Called after a successful save with a snackbar message. */
  onSaved: (message: string) => void;
}

export const RepositoryFormDialog: React.FC<RepositoryFormDialogProps> = ({
  plugin,
  open,
  repository,
  onClose,
  onSaved,
}) => {
  const service = useMemo(() => createPluginService(plugin), [plugin]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [retainRepoVersions, setRetainRepoVersions] = useState('');
  const [remote, setRemote] = useState('');
  const [pulpLabels, setPulpLabels] = useState('');
  const [extraValues, setExtraValues] = useState<PluginFieldValues>({});

  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [remotesLoading, setRemotesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const remoteOptions = useMemo(
    () => remotes.map((r) => ({ label: r.name, value: r.pulp_href })),
    [remotes]
  );

  useEffect(() => {
    if (!open) return;
    setName(repository?.name ?? '');
    setDescription(repository?.description ?? '');
    setRetainRepoVersions(
      repository?.retain_repo_versions === null || repository?.retain_repo_versions === undefined
        ? ''
        : String(repository.retain_repo_versions)
    );
    setRemote(repository?.remote ?? '');
    setPulpLabels(
      repository?.pulp_labels && Object.keys(repository.pulp_labels).length > 0
        ? JSON.stringify(repository.pulp_labels, null, 2)
        : ''
    );
    setExtraValues(
      initialFieldValues(plugin.repositoryFields, repository as Record<string, unknown> | null)
    );
    setError(null);

    const fetchRemotes = async () => {
      try {
        setRemotesLoading(true);
        const response = await service.remotes.list(0);
        setRemotes(response.results);
      } catch {
        // optional; the autocomplete just stays empty
      } finally {
        setRemotesLoading(false);
      }
    };
    void fetchRemotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, repository, plugin]);

  const retainInvalid =
    retainRepoVersions.trim() !== '' &&
    (!Number.isInteger(Number(retainRepoVersions)) || Number(retainRepoVersions) < 1);

  const handleSubmit = async () => {
    if (retainInvalid) {
      setError('Retain Repo Versions must be an integer >= 1');
      return;
    }

    const { labels, error: labelsError } = parsePulpLabelsJson(pulpLabels);
    if (labelsError) {
      setError(labelsError);
      return;
    }

    const { payload: extraPayload, error: extraError } = buildFieldPayload(
      plugin.repositoryFields,
      extraValues
    );
    if (extraError) {
      setError(extraError);
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      retain_repo_versions: retainRepoVersions.trim() ? Number(retainRepoVersions) : null,
      remote: remote || null,
      ...extraPayload,
    };
    if (labels && Object.keys(labels).length > 0) payload.pulp_labels = labels;

    try {
      setSaving(true);
      if (repository) {
        await service.repositories.update(repository.pulp_href, payload);
        onSaved('Repository updated successfully');
      } else {
        await service.repositories.create(payload);
        onSaved('Repository created successfully');
      }
      onClose();
    } catch (err) {
      setError(formatPulpApiError(err, `Failed to ${repository ? 'update' : 'create'} repository`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{repository ? 'Edit Repository' : 'Create Repository'}</DialogTitle>
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
            label="Description"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            label="Retain Repo Versions"
            fullWidth
            type="number"
            value={retainRepoVersions}
            onChange={(e) => setRetainRepoVersions(e.target.value)}
            error={retainInvalid}
            helperText={
              retainInvalid
                ? 'Must be an integer >= 1'
                : 'Number of repository versions to retain (leave empty to retain all versions)'
            }
          />
          <Autocomplete
            options={remoteOptions}
            loading={remotesLoading}
            value={remoteOptions.find((o) => o.value === remote) || null}
            onChange={(_, value) => setRemote(value?.value || '')}
            renderInput={(params) => (
              <TextField {...params} label="Remote" helperText="Optional default remote for sync" />
            )}
          />

          <PluginFieldInputs
            fields={plugin.repositoryFields}
            values={extraValues}
            onChange={(key, value) => setExtraValues((prev) => ({ ...prev, [key]: value }))}
          />

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
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !name.trim()}>
          {repository ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
