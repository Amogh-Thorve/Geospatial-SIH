import { apiRequest } from './api';

export async function getDashboardSummary() {
  return apiRequest('/api/dashboard/summary');
}

export async function listSubmissions() {
  return apiRequest('/api/submissions');
}
