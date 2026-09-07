/**
 * jalSaheliApi.js
 * API abstraction layer for the Jal Saheli module.
 *
 * ALL data access from UI components goes through these functions.
 * Real backend integration point:
 *   Configurable via VITE_API_BASE_URL.
 */

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';

// ---------------------------------------------------------------------------
// Auth Helpers & Token Management
// ---------------------------------------------------------------------------

export function getAuthToken() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('jal_saheli_token');
  }
  return null;
}

export function setAuthToken(token) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('jal_saheli_token', token);
  }
}

export function clearAuthToken() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('jal_saheli_token');
  }
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Ensure an active authentication token exists.
 */
export async function ensureAuthenticated() {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  const existing = getAuthToken();
  if (existing) return existing;

  const defaultPhone = '+919876543210';
  // Attempt login first
  try {
    const loginRes = await fetch(`${API_BASE_URL}/api/jal-saheli/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: defaultPhone }),
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      setAuthToken(data.access_token);
      return data.access_token;
    }
  } catch {
    // Login failed — attempt registration below
  }

  // Attempt registration
  const regRes = await fetch(`${API_BASE_URL}/api/jal-saheli/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sunita Devi',
      phone: defaultPhone,
      village: 'Kalyanpur',
      telegram_handle: '@sunita_jal',
    }),
  });
  if (regRes.ok) {
    const data = await regRes.json();
    setAuthToken(data.access_token);
    return data.access_token;
  }
  
  throw new Error("Failed to auto-authenticate with backend.");
}

export async function registerCadre({ name, phone, village, telegram_handle }) {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, village, telegram_handle }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.message || 'Registration failed');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  return data;
}

export async function loginCadre({ phone }) {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.message || 'Login failed');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  return data;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getProfile() {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/profile`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export async function getSubmissions() {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/submissions`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch submissions");
  return res.json();
}

export async function getSubmissionById(submissionId) {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/submissions/${submissionId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch submission");
  return res.json();
}

export async function getSubmissionStatus(submissionId) {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/submissions/${submissionId}/status`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch submission status");
  return res.json();
}

export async function getObservationTypes() {
  return [
    { id: 'water_body', label: 'Water Body', reward: 25 },
    { id: 'well', label: 'Well / Handpump', reward: 15 },
    { id: 'canal', label: 'Canal / Stream', reward: 20 },
    { id: 'rainwater_harvesting', label: 'Rainwater Harvesting', reward: 30 },
  ];
}

export async function submitObservation({ observationType, location, photoFile, notes }) {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  await ensureAuthenticated();
  const formData = new FormData();
  if (photoFile) formData.append('photo', photoFile);
  formData.append('observationType', typeof observationType === 'object' ? observationType.id : observationType);
  if (location) formData.append('location', JSON.stringify(location));
  if (notes) formData.append('notes', notes);

  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/submissions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.message || "Failed to submit observation");
  }
  
  const created = await res.json();
  
  // Proactively trigger verification pipeline in backend
  fetch(`${API_BASE_URL}/api/jal-saheli/submissions/${created.id}/verify`, {
    method: 'POST',
    headers: getAuthHeaders(),
  }).catch(() => {});
  
  return {
    submissionId: created.id,
    receivedAt: created.created_at || new Date().toISOString(),
    observationType,
    location,
    notes: notes || '',
    hasPhoto: !!photoFile,
  };
}

// ---------------------------------------------------------------------------
// Verification-related calls
// ---------------------------------------------------------------------------

export async function analyzeObservation(submissionId) {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/submissions/${submissionId}/ai-result`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch AI result");
  const data = await res.json();
  return {
    submissionId,
    confidence: data.confidence,
    confidenceDisplay: data.confidence_display || `${Math.round(data.confidence)}%`,
    classification: data.classification,
  };
}

export async function verifySatellite(submissionId) {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/submissions/${submissionId}/satellite-result`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch satellite result");
  const data = await res.json();
  return {
    submissionId,
    confidence: data.satellite_confidence,
    confidenceDisplay: data.satellite_confidence_display || `${Math.round(data.satellite_confidence)}%`,
    result: data.result,
  };
}

export async function getVerificationResult(submissionId) {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/submissions/${submissionId}/verification`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch verification result");
  return res.json();
}

// ---------------------------------------------------------------------------
// Earnings
// ---------------------------------------------------------------------------

export async function getEarnings() {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/earnings`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch earnings");
  return res.json();
}

export async function getEarningsSummary() {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not configured");
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE_URL}/api/jal-saheli/earnings/summary`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch earnings summary");
  return res.json();
}

export function getRewardForType(typeId) {
  const schedule = {
    water_body: 25,
    well: 15,
    canal: 20,
    rainwater_harvesting: 30,
  };
  return schedule[typeId] ?? 20;
}
