import type { PluginResourceColumn } from '../../constants/plugins';

/** Formats a resource field for an extra list column defined in the plugin config. */
export const formatColumnValue = (resource: object, column: PluginResourceColumn): string => {
  const value = (resource as Record<string, unknown>)[column.key];
  if (column.boolean) return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};
