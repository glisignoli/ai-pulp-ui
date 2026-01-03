import { apiService, withPaginationParams } from './api';
import type { PulpListResponse, PulpUser } from '../types/pulp';

const USERS_ENDPOINT = '/users/';

export interface CreateUserPayload {
  username: string;
  password: string | null;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  password?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_staff?: boolean;
  is_active?: boolean;
}

export const usersService = {
  list: (offset = 0, ordering?: string) =>
    apiService.get<PulpListResponse<PulpUser>>(withPaginationParams(USERS_ENDPOINT, { offset, ordering })),
  create: (payload: CreateUserPayload) => apiService.post<PulpUser>(USERS_ENDPOINT, payload),
  read: (href: string) => apiService.get<PulpUser>(href),
  update: (href: string, payload: UpdateUserPayload) => apiService.patch<PulpUser>(href, payload),
  delete: (href: string) => apiService.delete(href),
};
