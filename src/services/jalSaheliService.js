import { apiRequest } from './api';

export async function getProfile() {
  return apiRequest('/api/jal-saheli/profile');
}

export async function getSubmissions() {
  return apiRequest('/api/jal-saheli/submissions');
}

export async function submitObservation(payload) {
  return apiRequest('/api/jal-saheli/submissions', {
    method: 'POST',
    body: JSON.stringify({
      observation_type: payload.observationType?.id || payload.observationType || 'water_body',
      type_label: payload.observationType?.label || payload.typeLabel,
      lat: payload.location?.lat ?? payload.lat,
      lng: payload.location?.lng ?? payload.lng,
      location_label: payload.location?.label || payload.locationLabel || 'Field location',
      notes: payload.notes,
      photo_url: payload.photoUrl || null,
      channel: payload.channel || 'web',
      title: payload.title,
    }),
  });
}

export async function getEarnings() {
  return apiRequest('/api/jal-saheli/earnings');
}
