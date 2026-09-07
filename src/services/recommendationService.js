import { apiRequest } from './api';

export async function getRecommendation(submissionId) {
  return apiRequest(`/api/recommendations/${submissionId}`);
}
