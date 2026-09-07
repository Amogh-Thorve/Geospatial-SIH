// Mock GIS data for the GeoWise GIS Intelligence Map module.
// All coordinates are approximate mock points around Andhra Pradesh, India.
// This is demo data only — no real satellite / survey data is used.

export const mapLocations = [
  { id: "GW-1042", lat: 13.6288, lng: 79.4192, type: "intervention", name: "Check Dam", location: "Chittoor", status: "verified", confidence: 0.91, description: "Newly constructed check dam confirmed via field visit and photo evidence." },
  { id: "GW-1043", lat: 14.4426, lng: 79.9865, type: "intervention", name: "Farm Pond", location: "Nellore", status: "verified", confidence: 0.88, description: "Farm pond intervention verified against watershed plan records." },
  { id: "GW-1044", lat: 15.9129, lng: 79.7400, type: "flagged", name: "Contour Trench Site", location: "Kurnool", status: "flagged", confidence: 0.42, description: "Reported works do not match satellite change signature. Needs field review." },
  { id: "GW-1045", lat: 16.5062, lng: 80.6480, type: "waterbody", name: "Krishna River Segment", location: "Vijayawada", status: "monitored", confidence: 0.95, description: "Perennial water body segment tracked for seasonal extent changes." },
  { id: "GW-1046", lat: 17.6868, lng: 83.2185, type: "jal-saheli", name: "Community Well Report", location: "Visakhapatnam", status: "pending", confidence: 0.67, description: "Jal Saheli field volunteer submission awaiting verification." },
  { id: "GW-1047", lat: 16.9891, lng: 82.2475, type: "waterbody", name: "Kolleru Lake Fringe", location: "Eluru", status: "monitored", confidence: 0.93, description: "Wetland boundary monitored for encroachment and seasonal shrinkage." },
  { id: "GW-1048", lat: 15.4989, lng: 78.4983, type: "intervention", name: "Percolation Tank", location: "Anantapur", status: "verified", confidence: 0.85, description: "Percolation tank construction verified through geotagged imagery." },
  { id: "GW-1049", lat: 14.6819, lng: 77.6006, type: "flagged", name: "Afforestation Block", location: "Kadapa", status: "flagged", confidence: 0.38, description: "Claimed plantation area shows minimal NDVI change over reporting period." },
  { id: "GW-1050", lat: 17.0005, lng: 81.8040, type: "jal-saheli", name: "Pond Desilting Report", location: "West Godavari", status: "pending", confidence: 0.71, description: "Community-reported desilting activity, pending supervisor confirmation." },
  { id: "GW-1051", lat: 13.3410, lng: 79.0930, type: "intervention", name: "Boulder Check", location: "Chittoor", status: "verified", confidence: 0.89, description: "Boulder check structure verified against DPR (Detailed Project Report)." },
  { id: "GW-1052", lat: 18.1124, lng: 83.4091, type: "waterbody", name: "Sileru Reservoir Edge", location: "Alluri Sitharama Raju", status: "monitored", confidence: 0.9, description: "Reservoir edge tracked for water spread area across seasons." },
  { id: "GW-1053", lat: 15.1394, lng: 80.0499, type: "jal-saheli", name: "Borewell Recharge Pit", location: "Prakasam", status: "verified", confidence: 0.8, description: "Recharge pit reported and later verified by field coordinator." },
];

export const statusColors = {
  verified: "#16a34a",
  flagged: "#dc2626",
  monitored: "#2563eb",
  pending: "#d97706",
};

export const typeMeta = {
  intervention: { label: "Verified Intervention", color: "#16a34a" },
  flagged: { label: "Flagged Zone", color: "#dc2626" },
  waterbody: { label: "Water Body", color: "#2563eb" },
  "jal-saheli": { label: "Jal Saheli Submission", color: "#d97706" },
};

export const layerToggles = [
  { key: "intervention", label: "Interventions" },
  { key: "flagged", label: "Flagged Zones" },
  { key: "waterbody", label: "Water Bodies" },
  { key: "jal-saheli", label: "Jal Saheli" },
  { key: "ndvi", label: "NDVI" },
  { key: "ndwi", label: "NDWI" },
  { key: "change-detection", label: "Change Detection" },
];

export const mapCenter = { lat: 15.9129, lng: 79.7400 };