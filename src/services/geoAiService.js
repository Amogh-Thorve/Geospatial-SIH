/**
 * Geo AI integration boundary.
 * All calls go through the unified FastAPI process (Vite /api proxy or VITE_API_BASE_URL).
 */
import { apiRequest } from './api';

export async function analyzeSubmission(submissionId) {
  return apiRequest(`/api/submissions/${submissionId}/analyze`, { method: 'POST' });
}

export async function getAnalysis(submissionId) {
  return apiRequest(`/api/submissions/${submissionId}/analysis`);
}

export async function getSubmission(submissionId) {
  return apiRequest(`/api/submissions/${submissionId}`);
}

export async function listSubmissions() {
  return apiRequest('/api/submissions');
}

export async function analyzeLocation({ latitude, longitude, submissionId } = {}) {
  return apiRequest('/api/analyze-location', {
    method: 'POST',
    body: JSON.stringify({
      latitude,
      longitude,
      submission_id: submissionId || undefined,
    }),
  });
}

export async function getGeoAiHealth() {
  return apiRequest('/api/geo-ai/health');
}
