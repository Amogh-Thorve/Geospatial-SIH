/**
 * Geo AI integration boundary.
 * UI talks only to analyzeSubmission / getAnalysis.
 * Backend currently uses MockGeoAIProvider — not live ML.
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
