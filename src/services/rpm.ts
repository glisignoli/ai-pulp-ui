import { apiService, withPaginationParams } from './api';
import type { Distribution, Publication, PulpListResponse, Remote, Repository } from '../types/pulp';

const REPOSITORIES_ENDPOINT = '/repositories/rpm/rpm/';
const REMOTES_ENDPOINT = '/remotes/rpm/rpm/';
const DISTRIBUTIONS_ENDPOINT = '/distributions/rpm/rpm/';
const PUBLICATIONS_ENDPOINT = '/publications/rpm/rpm/';

export const rpmService = {
  repositories: {
    list: (offset = 0, ordering?: string) =>
      apiService.get<PulpListResponse<Repository>>(
        withPaginationParams(REPOSITORIES_ENDPOINT, { offset, ordering })
      ),
    create: (payload: unknown) => apiService.post(REPOSITORIES_ENDPOINT, payload),
    update: (href: string, payload: unknown) => apiService.put(href, payload),
    delete: (href: string) => apiService.delete(href),
    read: (href: string) => apiService.get<Repository>(href),
  },
  remotes: {
    list: (offset = 0, ordering?: string) =>
      apiService.get<PulpListResponse<Remote>>(withPaginationParams(REMOTES_ENDPOINT, { offset, ordering })),
    create: (payload: unknown) => apiService.post(REMOTES_ENDPOINT, payload),
    update: (href: string, payload: unknown) => apiService.put(href, payload),
    delete: (href: string) => apiService.delete(href),
    read: (href: string) => apiService.get<Remote>(href),
  },
  distributions: {
    list: (offset = 0, ordering?: string) =>
      apiService.get<PulpListResponse<Distribution>>(
        withPaginationParams(DISTRIBUTIONS_ENDPOINT, { offset, ordering })
      ),
    create: (payload: unknown) => apiService.post(DISTRIBUTIONS_ENDPOINT, payload),
    update: (href: string, payload: unknown) => apiService.put(href, payload),
    delete: (href: string) => apiService.delete(href),
    read: (href: string) => apiService.get<Distribution>(href),
  },
  publications: {
    list: (offset = 0, ordering?: string) =>
      apiService.get<PulpListResponse<Publication>>(
        withPaginationParams(PUBLICATIONS_ENDPOINT, { offset, ordering })
      ),
    create: (payload: unknown) => apiService.post(PUBLICATIONS_ENDPOINT, payload),
    update: (href: string, payload: unknown) => apiService.put(href, payload),
    delete: (href: string) => apiService.delete(href),
    read: (href: string) => apiService.get<Publication>(href),
  },
};
