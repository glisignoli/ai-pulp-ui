import { apiService } from './api';

export interface OrphansCleanupRequest {
  content_hrefs?: string[];
  orphan_protection_time?: number;
}

export type OrphansCleanupResponse = unknown;

const ORPHANS_CLEANUP_ENDPOINT = '/orphans/cleanup/';

export const orphansService = {
  cleanup: async (payload: OrphansCleanupRequest): Promise<OrphansCleanupResponse> => {
    return apiService.post<OrphansCleanupResponse>(ORPHANS_CLEANUP_ENDPOINT, payload);
  },
};
