import { apiService } from './api';

export interface RepairRequest {
  verify_checksums: boolean;
}

export type RepairResponse = unknown;

const REPAIR_ENDPOINT = '/repair/';

export const repairService = {
  repair: async (payload: RepairRequest): Promise<RepairResponse> => {
    return apiService.post<RepairResponse>(REPAIR_ENDPOINT, payload);
  },
};
