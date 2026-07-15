import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import type { Remote } from '../../types/pulp';
import type { PluginConfig, RemotePolicy } from '../../constants/plugins';
import { createPluginService } from '../../services/pluginCrud';
import { formatPulpApiError } from '../../services/api';
import { parsePulpLabelsJson } from '../../utils/pulp';
import { PluginFieldInputs, buildFieldPayload, initialFieldValues, type PluginFieldValues } from './pluginFields';

function parseHeadersJson(input: string): { headers: Record<string, string> | null; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { headers: null, error: null };

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { headers: null, error: 'Invalid headers JSON (must be an object of string values)' };
    }
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        return { headers: null, error: 'Invalid headers JSON (must be an object of string values)' };
      }
    }

    return { headers: parsed as Record<string, string>, error: null };
  } catch {
    return { headers: null, error: 'Invalid headers JSON (must be an object of string values)' };
  }
}

/**
 * Fields shared by every plugin's remote (the pulpcore Remote base serializer).
 * Numbers are held as raw input strings and converted on submit.
 */
interface CommonRemoteFormData {
  name: string;
  url: string;
  policy: RemotePolicy;
  tls_validation: boolean;
  username: string;
  password: string;
  ca_cert: string;
  client_cert: string;
  client_key: string;
  proxy_url: string;
  proxy_username: string;
  proxy_password: string;
  download_concurrency: string;
  max_retries: string;
  rate_limit: string;
  total_timeout: string;
  connect_timeout: string;
  sock_connect_timeout: string;
  sock_read_timeout: string;
  pulp_labels: string;
  headers: string;
}

const numberField = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

const emptyForm = (plugin: PluginConfig): CommonRemoteFormData => ({
  name: '',
  url: '',
  policy: plugin.remotePolicies[0],
  tls_validation: true,
  username: '',
  password: '',
  ca_cert: '',
  client_cert: '',
  client_key: '',
  proxy_url: '',
  proxy_username: '',
  proxy_password: '',
  download_concurrency: '',
  max_retries: '',
  rate_limit: '',
  total_timeout: '',
  connect_timeout: '',
  sock_connect_timeout: '',
  sock_read_timeout: '',
  pulp_labels: '',
  headers: '',
});

const formFromRemote = (plugin: PluginConfig, remote: Remote): CommonRemoteFormData => ({
  name: remote.name,
  url: remote.url,
  policy: (remote.policy as RemotePolicy) || plugin.remotePolicies[0],
  tls_validation: remote.tls_validation ?? true,
  // Credentials and keys are write-only in the API and never echoed back.
  username: '',
  password: '',
  ca_cert: remote.ca_cert || '',
  client_cert: remote.client_cert || '',
  client_key: '',
  proxy_url: remote.proxy_url || '',
  proxy_username: '',
  proxy_password: '',
  download_concurrency: numberField(remote.download_concurrency),
  max_retries: numberField(remote.max_retries),
  rate_limit: numberField(remote.rate_limit),
  total_timeout: numberField(remote.total_timeout),
  connect_timeout: numberField(remote.connect_timeout),
  sock_connect_timeout: numberField(remote.sock_connect_timeout),
  sock_read_timeout: numberField(remote.sock_read_timeout),
  pulp_labels: remote.pulp_labels && Object.keys(remote.pulp_labels).length > 0
    ? JSON.stringify(remote.pulp_labels, null, 2)
    : '',
  headers: remote.headers && Object.keys(remote.headers).length > 0
    ? JSON.stringify(remote.headers, null, 2)
    : '',
});

interface NumberSpec {
  key: 'download_concurrency' | 'max_retries' | 'rate_limit' | 'total_timeout' | 'connect_timeout' | 'sock_connect_timeout' | 'sock_read_timeout';
  label: string;
  helperText: string;
  min?: number;
  float?: boolean;
}

const NUMBER_SPECS: Record<NumberSpec['key'], NumberSpec> = {
  download_concurrency: {
    key: 'download_concurrency',
    label: 'Download Concurrency',
    helperText: 'Total number of simultaneous connections',
    min: 1,
  },
  max_retries: {
    key: 'max_retries',
    label: 'Max Retries',
    helperText: 'Maximum number of retry attempts after a download failure',
  },
  rate_limit: {
    key: 'rate_limit',
    label: 'Rate Limit',
    helperText: 'Limits requests per second for each concurrent downloader',
    min: 0,
  },
  total_timeout: {
    key: 'total_timeout',
    label: 'Total Timeout',
    helperText: 'Total timeout for download connections',
    min: 0,
    float: true,
  },
  connect_timeout: {
    key: 'connect_timeout',
    label: 'Connect Timeout',
    helperText: 'Connect timeout for download connections',
    min: 0,
    float: true,
  },
  sock_connect_timeout: {
    key: 'sock_connect_timeout',
    label: 'Socket Connect Timeout',
    helperText: 'Socket connect timeout for download connections',
    min: 0,
    float: true,
  },
  sock_read_timeout: {
    key: 'sock_read_timeout',
    label: 'Socket Read Timeout',
    helperText: 'Socket read timeout for download connections',
    min: 0,
    float: true,
  },
};

const invalidNumberMessage = (spec: NumberSpec, raw: string): string | null => {
  if (!raw.trim()) return null;
  const value = Number(raw);
  if (Number.isNaN(value)) return `${spec.label} must be a number`;
  if (!spec.float && !Number.isInteger(value)) return `${spec.label} must be an integer`;
  if (spec.min !== undefined && value < spec.min) return `${spec.label} must be >= ${spec.min}`;
  return null;
};

interface RemoteFormDialogProps {
  plugin: PluginConfig;
  open: boolean;
  /** Remote being edited, or null to create a new one. */
  remote: Remote | null;
  onClose: () => void;
  /** Called after a successful save with a snackbar message. */
  onSaved: (message: string) => void;
}

export const RemoteFormDialog: React.FC<RemoteFormDialogProps> = ({
  plugin,
  open,
  remote,
  onClose,
  onSaved,
}) => {
  const service = useMemo(() => createPluginService(plugin), [plugin]);

  const [formData, setFormData] = useState<CommonRemoteFormData>(emptyForm(plugin));
  const [extraValues, setExtraValues] = useState<PluginFieldValues>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData(remote ? formFromRemote(plugin, remote) : emptyForm(plugin));
    setExtraValues(initialFieldValues(plugin.remoteFields, remote as Record<string, unknown> | null));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, remote, plugin]);

  const handleChange = (field: keyof CommonRemoteFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    for (const spec of Object.values(NUMBER_SPECS)) {
      const message = invalidNumberMessage(spec, formData[spec.key]);
      if (message) {
        setError(message);
        return;
      }
    }

    const { labels: pulpLabels, error: pulpLabelsError } = parsePulpLabelsJson(formData.pulp_labels);
    if (pulpLabelsError) {
      setError(pulpLabelsError);
      return;
    }

    const { headers, error: headersError } = parseHeadersJson(formData.headers);
    if (headersError) {
      setError(headersError);
      return;
    }

    const { payload: extraPayload, error: extraError } = buildFieldPayload(
      plugin.remoteFields,
      extraValues
    );
    if (extraError) {
      setError(extraError);
      return;
    }

    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      url: formData.url.trim(),
      policy: formData.policy,
      tls_validation: formData.tls_validation,
      ...extraPayload,
    };

    if (formData.username) payload.username = formData.username;
    if (formData.password) payload.password = formData.password;
    if (formData.ca_cert) payload.ca_cert = formData.ca_cert;
    if (formData.client_cert) payload.client_cert = formData.client_cert;
    if (formData.client_key) payload.client_key = formData.client_key;
    if (formData.proxy_url) payload.proxy_url = formData.proxy_url.trim();
    if (formData.proxy_username) payload.proxy_username = formData.proxy_username;
    if (formData.proxy_password) payload.proxy_password = formData.proxy_password;
    for (const spec of Object.values(NUMBER_SPECS)) {
      const raw = formData[spec.key];
      if (raw.trim()) payload[spec.key] = Number(raw);
    }
    if (pulpLabels && Object.keys(pulpLabels).length > 0) payload.pulp_labels = pulpLabels;
    if (headers && Object.keys(headers).length > 0) payload.headers = headers;

    try {
      setSaving(true);
      if (remote) {
        await service.remotes.update(remote.pulp_href, payload);
        onSaved('Remote updated successfully');
      } else {
        await service.remotes.create(payload);
        onSaved('Remote created successfully');
      }
      onClose();
    } catch (err) {
      setError(formatPulpApiError(err, `Failed to ${remote ? 'update' : 'create'} remote`));
    } finally {
      setSaving(false);
    }
  };

  const renderNumberField = (spec: NumberSpec) => {
    const raw = formData[spec.key];
    const message = invalidNumberMessage(spec, raw);
    return (
      <TextField
        key={spec.key}
        label={spec.label}
        fullWidth
        type="number"
        value={raw}
        onChange={(e) => handleChange(spec.key, e.target.value)}
        error={!!message}
        helperText={message || spec.helperText}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{remote ? 'Edit Remote' : 'Create Remote'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}

          <TextField
            label="Name"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            helperText="A unique name for this remote"
          />
          <TextField
            label="URL"
            fullWidth
            required
            value={formData.url}
            onChange={(e) => handleChange('url', e.target.value)}
            helperText="The URL of an external content source"
          />

          {plugin.remoteFields?.length ? (
            <>
              <Typography variant="h6" sx={{ mt: 2 }}>{plugin.label} Settings</Typography>
              <PluginFieldInputs
                fields={plugin.remoteFields}
                values={extraValues}
                onChange={(key, value) => setExtraValues((prev) => ({ ...prev, [key]: value }))}
              />
            </>
          ) : null}

          <Typography variant="h6" sx={{ mt: 2 }}>Authentication</Typography>
          <TextField
            label="Username"
            fullWidth
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            helperText="Username for authentication when syncing"
          />
          <TextField
            label="Password"
            fullWidth
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            helperText="Password for authentication when syncing"
          />

          <Typography variant="h6" sx={{ mt: 2 }}>TLS Settings</Typography>
          <FormControl fullWidth>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.tls_validation}
                  onChange={(e) => handleChange('tls_validation', e.target.checked)}
                />
              }
              label="TLS Validation"
            />
            <FormHelperText>If True, TLS peer validation must be performed</FormHelperText>
          </FormControl>
          <TextField
            label="CA Certificate"
            fullWidth
            multiline
            rows={3}
            value={formData.ca_cert}
            onChange={(e) => handleChange('ca_cert', e.target.value)}
            helperText="A PEM encoded CA certificate used to validate the server certificate"
          />
          <TextField
            label="Client Certificate"
            fullWidth
            multiline
            rows={3}
            value={formData.client_cert}
            onChange={(e) => handleChange('client_cert', e.target.value)}
            helperText="A PEM encoded client certificate used for authentication"
          />
          <TextField
            label="Client Key"
            fullWidth
            multiline
            rows={3}
            value={formData.client_key}
            onChange={(e) => handleChange('client_key', e.target.value)}
            helperText="A PEM encoded private key used for authentication"
          />

          <Typography variant="h6" sx={{ mt: 2 }}>Download Settings</Typography>
          <TextField
            label="Policy"
            fullWidth
            select
            value={formData.policy}
            onChange={(e) => handleChange('policy', e.target.value)}
            helperText="Download policy for this remote"
          >
            {plugin.remotePolicies.map((policy) => (
              <MenuItem key={policy} value={policy}>
                {policy}
              </MenuItem>
            ))}
          </TextField>
          {renderNumberField(NUMBER_SPECS.download_concurrency)}
          {renderNumberField(NUMBER_SPECS.max_retries)}
          {renderNumberField(NUMBER_SPECS.rate_limit)}

          <Typography variant="h6" sx={{ mt: 2 }}>Proxy Settings</Typography>
          <TextField
            label="Proxy URL"
            fullWidth
            value={formData.proxy_url}
            onChange={(e) => handleChange('proxy_url', e.target.value)}
            helperText="The proxy URL. Format: scheme://host:port"
          />
          <TextField
            label="Proxy Username"
            fullWidth
            value={formData.proxy_username}
            onChange={(e) => handleChange('proxy_username', e.target.value)}
            helperText="The username to authenticate to the proxy"
          />
          <TextField
            label="Proxy Password"
            fullWidth
            type="password"
            value={formData.proxy_password}
            onChange={(e) => handleChange('proxy_password', e.target.value)}
            helperText="The password to authenticate to the proxy"
          />

          <Typography variant="h6" sx={{ mt: 2 }}>Timeout Settings (seconds)</Typography>
          {renderNumberField(NUMBER_SPECS.total_timeout)}
          {renderNumberField(NUMBER_SPECS.connect_timeout)}
          {renderNumberField(NUMBER_SPECS.sock_connect_timeout)}
          {renderNumberField(NUMBER_SPECS.sock_read_timeout)}

          <Typography variant="h6" sx={{ mt: 2 }}>Additional Settings</Typography>
          <TextField
            label="Pulp Labels (JSON)"
            fullWidth
            multiline
            minRows={3}
            value={formData.pulp_labels}
            onChange={(e) => handleChange('pulp_labels', e.target.value)}
            helperText='Optional: JSON object of string-to-string labels, e.g. {"env":"dev"}'
          />
          <TextField
            label="Headers (JSON)"
            fullWidth
            multiline
            minRows={3}
            value={formData.headers}
            onChange={(e) => handleChange('headers', e.target.value)}
            helperText='Optional: JSON object of string-to-string HTTP headers (example: {"Authorization":"Bearer ..."})'
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || !formData.name.trim() || !formData.url.trim()}
        >
          {remote ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
