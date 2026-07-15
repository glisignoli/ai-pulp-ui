import React from 'react';
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  TextField,
} from '@mui/material';
import type { PluginField } from '../../constants/plugins';

/**
 * Form state for a set of PluginFields. Booleans are stored as booleans;
 * everything else (including numbers) is stored as the raw input string and
 * converted when the payload is built.
 */
export type PluginFieldValues = Record<string, string | boolean>;

export const initialFieldValues = (
  fields: readonly PluginField[] | undefined,
  resource?: Record<string, unknown> | null
): PluginFieldValues => {
  const values: PluginFieldValues = {};

  for (const field of fields ?? []) {
    if (resource) {
      const current = resource[field.key];
      switch (field.type) {
        case 'boolean':
          values[field.key] = typeof current === 'boolean' ? current : field.defaultValue === true;
          break;
        case 'password':
          // Write-only in the API; never echoed back.
          values[field.key] = '';
          break;
        case 'json':
          values[field.key] =
            current && typeof current === 'object' ? JSON.stringify(current, null, 2) : '';
          break;
        case 'stringlist':
          values[field.key] = Array.isArray(current) ? current.join('\n') : '';
          break;
        default:
          values[field.key] = current === null || current === undefined ? '' : String(current);
      }
    } else if (field.type === 'boolean') {
      values[field.key] = field.defaultValue === true;
    } else {
      values[field.key] = field.defaultValue === undefined ? '' : String(field.defaultValue);
    }
  }

  return values;
};

const numberError = (field: PluginField, raw: string): string | null => {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  if (Number.isNaN(value)) return `${field.label} must be a number`;
  if (!field.float && !Number.isInteger(value)) return `${field.label} must be an integer`;
  if (field.min !== undefined && value < field.min) return `${field.label} must be >= ${field.min}`;
  return null;
};

/**
 * Converts form values into an API payload fragment. Booleans are always
 * sent; other fields are omitted when empty (matching how the rest of the
 * form builders treat optional fields). Returns an error message instead of
 * a payload when a value is invalid.
 */
export const buildFieldPayload = (
  fields: readonly PluginField[] | undefined,
  values: PluginFieldValues
): { payload: Record<string, unknown>; error: string | null } => {
  const payload: Record<string, unknown> = {};

  for (const field of fields ?? []) {
    const value = values[field.key];

    if (field.type === 'boolean') {
      payload[field.key] = value === true;
      continue;
    }

    const raw = typeof value === 'string' ? value : '';
    if (!raw.trim()) {
      if (field.required) return { payload, error: `${field.label} is required` };
      continue;
    }

    switch (field.type) {
      case 'number': {
        const error = numberError(field, raw);
        if (error) return { payload, error };
        payload[field.key] = Number(raw);
        break;
      }
      case 'json': {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return { payload, error: `${field.label} must be a JSON object` };
          }
          payload[field.key] = parsed;
        } catch {
          return { payload, error: `${field.label} must be valid JSON` };
        }
        break;
      }
      case 'stringlist':
        payload[field.key] = raw.split(/[\s,]+/).filter(Boolean);
        break;
      case 'multiline':
      case 'password':
        payload[field.key] = raw;
        break;
      default:
        payload[field.key] = raw.trim();
    }
  }

  return { payload, error: null };
};

interface PluginFieldInputsProps {
  fields: readonly PluginField[] | undefined;
  values: PluginFieldValues;
  onChange: (key: string, value: string | boolean) => void;
}

export const PluginFieldInputs: React.FC<PluginFieldInputsProps> = ({ fields, values, onChange }) => (
  <>
    {(fields ?? []).map((field) => {
      if (field.type === 'boolean') {
        return (
          <FormControl fullWidth key={field.key}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={values[field.key] === true}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                />
              }
              label={field.label}
            />
            {field.helperText ? <FormHelperText>{field.helperText}</FormHelperText> : null}
          </FormControl>
        );
      }

      const raw = typeof values[field.key] === 'string' ? (values[field.key] as string) : '';

      if (field.type === 'select') {
        return (
          <TextField
            key={field.key}
            select
            fullWidth
            label={field.label}
            required={field.required}
            value={raw}
            onChange={(e) => onChange(field.key, e.target.value)}
            helperText={field.helperText}
          >
            {!field.required ? <MenuItem value="">(server default)</MenuItem> : null}
            {(field.options ?? []).map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        );
      }

      const invalidNumber = field.type === 'number' ? numberError(field, raw) : null;
      const multiline = field.type === 'multiline' || field.type === 'json' || field.type === 'stringlist';

      return (
        <TextField
          key={field.key}
          fullWidth
          label={field.label}
          required={field.required}
          type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
          multiline={multiline}
          minRows={multiline ? 3 : undefined}
          value={raw}
          onChange={(e) => onChange(field.key, e.target.value)}
          error={!!invalidNumber}
          helperText={invalidNumber || field.helperText}
        />
      );
    })}
  </>
);
