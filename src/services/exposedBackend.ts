const API_PATH = '/pulp/api/v3';

const normalizeBackendOrigin = (backend: string) => backend.replace(/\/+$/, '');

const getBackendOriginFromEnv = (raw: string | undefined): string | null => {
  const backend = (raw ?? '').trim();
  if (!backend) return null;

  const withoutTrailingSlash = normalizeBackendOrigin(backend);
  const apiPathNoSlash = API_PATH.replace(/\/+$/, '');

  if (
    withoutTrailingSlash.endsWith(apiPathNoSlash) ||
    withoutTrailingSlash.endsWith(`${apiPathNoSlash}/`)
  ) {
    return withoutTrailingSlash.slice(0, withoutTrailingSlash.length - apiPathNoSlash.length);
  }

  return withoutTrailingSlash;
};

export const getExposedBackendOrigin = (): string => {
  // Highest priority: explicit exposed backend origin.
  const exposed = getBackendOriginFromEnv(import.meta.env.PULP_EXPOSED_BACKEND as string | undefined);
  if (exposed) return exposed;

  // Default: match Vite's proxy target (configured via PULP_BACKEND).
  const backend = getBackendOriginFromEnv(import.meta.env.PULP_BACKEND as string | undefined);
  if (backend) return backend;

  // Fallback: same default as vite.config.ts
  return 'http://localhost:8080';
};

const toPathOnly = (urlOrPath: string): string => {
  const trimmed = urlOrPath.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed}`;
};

export const toExposedBackendUrl = (urlOrPath: string | null | undefined): string | null => {
  if (!urlOrPath) return null;

  const pathOnly = toPathOnly(urlOrPath);
  if (!pathOnly) return null;

  const origin = getExposedBackendOrigin();
  return `${origin}${pathOnly}`;
};
