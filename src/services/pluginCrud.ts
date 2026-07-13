import { apiService, withPaginationParams } from './api';
import type {
  Distribution,
  Publication,
  PulpListResponse,
  Remote,
  Repository,
  RepositoryVersion,
} from '../types/pulp';
import type { PluginConfig } from '../constants/plugins';

const crud = <T>(endpoint: string) => ({
  list: (offset = 0, ordering?: string) =>
    apiService.get<PulpListResponse<T>>(withPaginationParams(endpoint, { offset, ordering })),
  create: (payload: unknown) => apiService.post(endpoint, payload),
  update: (href: string, payload: unknown) => apiService.put(href, payload),
  delete: (href: string) => apiService.delete(href),
  read: (href: string) => apiService.get<T>(href),
});

export const createPluginService = (plugin: PluginConfig) => ({
  repositories: {
    ...crud<Repository>(plugin.endpoints.repositories),
    versions: (versionsHref: string) =>
      apiService.get<PulpListResponse<RepositoryVersion>>(versionsHref),
    sync: (href: string, payload: unknown) => apiService.post(`${href}sync/`, payload),
  },
  remotes: crud<Remote>(plugin.endpoints.remotes),
  distributions: crud<Distribution>(plugin.endpoints.distributions),
  publications: plugin.endpoints.publications ? crud<Publication>(plugin.endpoints.publications) : null,
});

export type PluginService = ReturnType<typeof createPluginService>;
