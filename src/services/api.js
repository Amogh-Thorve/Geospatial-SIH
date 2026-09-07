/**
 * Central HTTP client for GeoWise.
 * All page-level data access should go through src/services/*.
 */

export class ApiError extends Error {
  constructor(message, { status, path } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }
}

export function getApiBase() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured === undefined || configured === null || configured === '') {
    return '';
  }
  return String(configured).replace(/\/$/, '');
}

export async function apiRequest(path, options = {}) {
  const url = `${getApiBase()}${path}`;
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError(
      `Backend unreachable (${url}). Start the FastAPI server on port 8000.`,
      { status: 0, path },
    );
  }
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      detail = body.detail || body.message || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(typeof detail === 'string' ? detail : JSON.stringify(detail), {
      status: response.status,
      path,
    });
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function checkHealth() {
  return apiRequest('/api/health');
}
