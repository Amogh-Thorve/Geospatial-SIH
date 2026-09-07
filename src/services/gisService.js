import { apiRequest } from './api';

export async function getGisFeatures() {
  return apiRequest('/api/gis/features');
}

export function featuresToLocations(collection) {
  const features = collection?.features || [];
  return features.map((f) => {
    const p = f.properties || {};
    const coords = f.geometry?.coordinates || [0, 0];
    return {
      id: p.id,
      lat: coords[1],
      lng: coords[0],
      type: p.type,
      name: p.name,
      location: p.location,
      status: p.status,
      confidence: p.confidence,
      description: p.description,
      priority: p.priority,
      submissionId: p.submission_id,
    };
  });
}
