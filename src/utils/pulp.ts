export function stripPulpOrigin(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.pathname;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export function parsePulpLabelsJson(
  input: string
): { labels: Record<string, string> | null; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { labels: null, error: null };

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        labels: null,
        error: 'Invalid pulp_labels JSON (must be an object of string values)',
      };
    }

    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        return {
          labels: null,
          error: 'Invalid pulp_labels JSON (must be an object of string values)',
        };
      }
      record[key] = value;
    }

    return { labels: record, error: null };
  } catch {
    return { labels: null, error: 'Invalid pulp_labels JSON (must be an object of string values)' };
  }
}
