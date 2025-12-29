import { apiService } from './api';
import type { Distribution, PulpListResponse, Remote, Repository, RepositoryVersion } from '../types/pulp';

const REPOSITORIES_ENDPOINT = '/repositories/container/container/';
const REMOTES_ENDPOINT = '/remotes/container/container/';
const DISTRIBUTIONS_ENDPOINT = '/distributions/container/container/';

export const containerService = {
  repositories: {
    list: () => apiService.get<PulpListResponse<Repository>>(REPOSITORIES_ENDPOINT),
    create: (payload: any) => apiService.post(REPOSITORIES_ENDPOINT, payload),
    update: (href: string, payload: any) => apiService.put(href, payload),
    delete: (href: string) => apiService.delete(href),
    read: (href: string) => apiService.get<Repository>(href),
    versions: (href: string) => apiService.get<PulpListResponse<RepositoryVersion>>(href),
    sync: (href: string, payload: any) => apiService.post(`${href}sync/`, payload),
  },
  remotes: {
    list: () => apiService.get<PulpListResponse<Remote>>(REMOTES_ENDPOINT),
    create: (payload: any) => apiService.post(REMOTES_ENDPOINT, payload),
    update: (href: string, payload: any) => apiService.put(href, payload),
    delete: (href: string) => apiService.delete(href),
    read: (href: string) => apiService.get<Remote>(href),
  },
  distributions: {
    list: () => apiService.get<PulpListResponse<Distribution>>(DISTRIBUTIONS_ENDPOINT),
    create: (payload: any) => apiService.post(DISTRIBUTIONS_ENDPOINT, payload),
    update: (href: string, payload: any) => apiService.put(href, payload),
    delete: (href: string) => apiService.delete(href),
    read: (href: string) => apiService.get<Distribution>(href),
  },
};
