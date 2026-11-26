import axios from 'axios';
import { HealthCheckResponse } from '@queueless/shared-types';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const { data } = await apiClient.get<HealthCheckResponse>('/health');
  return data;
}
