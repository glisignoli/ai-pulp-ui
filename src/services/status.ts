import { apiService } from './api';
import type { PulpStatusResponse } from '../types/status';

const STATUS_ENDPOINT = '/status/';

export const statusService = {
  read: () => apiService.get<PulpStatusResponse>(STATUS_ENDPOINT),
};
