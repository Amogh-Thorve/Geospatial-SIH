import { apiRequest } from './api';

export async function listVerificationTasks() {
  return apiRequest('/api/verification/tasks');
}

export async function getVerificationTask(taskId) {
  return apiRequest(`/api/verification/tasks/${taskId}`);
}

export async function updateVerificationTask(taskId, payload) {
  return apiRequest(`/api/verification/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
