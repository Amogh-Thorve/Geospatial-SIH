// GeoWise Mock Data Source

export const MOCK_KPIS = [
  {
    id: "monitored-sites",
    label: "Monitored Sites",
    value: "1,248",
    change: "+42 this month",
    trend: "up",
    status: "info",
    icon: "MapPin"
  },
  {
    id: "flagged-zones",
    label: "Flagged Zones",
    value: "87",
    change: "12 high priority",
    trend: "down",
    status: "warning",
    icon: "AlertTriangle"
  },
  {
    id: "verified-interventions",
    label: "Verified Interventions",
    value: "932",
    change: "94.2% audit pass",
    trend: "up",
    status: "success",
    icon: "CheckCircle2"
  },
  {
    id: "satellite-match-rate",
    label: "Satellite Match Rate",
    value: "93.4%",
    change: "+1.8% algorithm v2.4",
    trend: "up",
    status: "success",
    icon: "Satellite"
  }
];

export const MOCK_ALERTS = [
  {
    id: "ALT-801",
    title: "Satellite Mismatch Detected",
    location: "Chittoor • Sub-basin 4B",
    submissionId: "GW-1042",
    priority: "high",
    time: "25 mins ago",
    description: "Ground image claims Check Dam completion, but Sentinel-2 spectral analysis indicates raw soil disturbance with zero surface water retention."
  },
  {
    id: "ALT-802",
    title: "Unauthorized Soil Excavation",
    location: "Anantapur • Penna River Valley",
    submissionId: "GW-1039",
    priority: "high",
    time: "1 hour ago",
    description: "Multi-temporal SAR backscatter change detected outside designated NREGA watershed intervention boundary."
  },
  {
    id: "ALT-803",
    title: "Potential Embankment Breach Risk",
    location: "Kurnool • Nandyal Canal Zone",
    submissionId: "GW-1021",
    priority: "medium",
    time: "3 hours ago",
    description: "High precipitation forecast combined with reduced bund wall stability flagged by ground image inspection."
  },
  {
    id: "ALT-804",
    title: "Verification Overdue (>48h)",
    location: "Kadapa • Rayachoti Block",
    submissionId: "GW-0994",
    priority: "medium",
    time: "5 hours ago",
    description: "Field audit submission pending officer verification for over 48 hours."
  }
];

export const MOCK_MAP_MARKERS = [
  {
    id: "GW-1042",
    lat: 13.2172,
    lng: 79.1003,
    title: "Check Dam - Sub-basin 4B",
    district: "Chittoor",
    type: "flagged",
    typeLabel: "Flagged Zone",
    submitter: "Asha Patil (Jal Saheli)",
    date: "2026-09-05",
    confidence: "91%",
    status: "Flagged",
    description: "Sentinel-2 spectral mismatch detected."
  },
  {
    id: "GW-1048",
    lat: 14.6819,
    lng: 77.6006,
    title: "Farm Pond Excavation",
    district: "Anantapur",
    type: "jal-saheli",
    typeLabel: "Jal Saheli Submission",
    submitter: "Ramesh Kumar (Jal Saheli)",
    date: "2026-09-04",
    confidence: "78%",
    status: "Pending Review",
    description: "Low resolution ground photo submission."
  },
  {
    id: "GW-1033",
    lat: 15.8281,
    lng: 78.0373,
    title: "Continuous Contour Trench",
    district: "Kurnool",
    type: "verified",
    typeLabel: "Verified Intervention",
    submitter: "Sita Devi (Jal Saheli)",
    date: "2026-09-02",
    confidence: "96%",
    status: "Verified",
    description: "Verified by District Officer M. Rao."
  },
  {
    id: "GW-1012",
    lat: 14.4673,
    lng: 78.8242,
    title: "Percolation Tank - Kadapa",
    district: "Kadapa",
    type: "verified",
    typeLabel: "Verified Intervention",
    submitter: "Asha Patil (Jal Saheli)",
    date: "2026-08-30",
    confidence: "98%",
    status: "Verified",
    description: "High NDWI surface water signature confirmed."
  },
  {
    id: "GW-1055",
    lat: 16.5062,
    lng: 80.6480,
    title: "Krishna Reservoir Buffer",
    district: "Vijayawada",
    type: "water-body",
    typeLabel: "Water Body",
    submitter: "Automated Sentinel-2 L2A",
    date: "2026-09-06",
    confidence: "99%",
    status: "Monitored",
    description: "Seasonal runoff accumulation tracked."
  },
  {
    id: "GW-1057",
    lat: 14.2697,
    lng: 79.8037,
    title: "Gully Plug - Rajampet",
    district: "Nellore Border",
    type: "flagged",
    typeLabel: "Flagged Zone",
    submitter: "K. Reddy (Field Officer)",
    date: "2026-09-05",
    confidence: "82%",
    status: "Under Review",
    description: "Structural erosion anomaly detected."
  }
];

export const MOCK_SUBMISSION_DETAIL = {
  id: "GW-1042",
  title: "Check Dam Construction — Sub-basin 4B",
  location: "Palamaner Mandal, Chittoor District, AP",
  coordinates: "13.2172° N, 79.1003° E",
  submitter: {
    name: "Asha Patil",
    role: "Jal Saheli Lead",
    phone: "+91 98765 43210",
    reputationScore: "96 / 100",
    badge: "Master Verifier"
  },
  timestamp: "2026-09-05 14:32 IST",
  classification: "Check Dam",
  confidence: "91%",
  satelliteMatch: "MATCH",
  satelliteMatchStatus: "verified", // verified | mismatch | pending
  ndviChange: "+18%",
  ndwiChange: "+0.32",
  groundPhotoUrl: "https://images.unsplash.com/photo-1590496793929-36417d3117de?w=800&auto=format&fit=crop",
  satelliteImageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop",
  xaiReasons: [
    {
      id: 1,
      title: "Construction Signature Detected",
      description: "Computer vision model detected masonry stone work and spillway structural pattern with 91.4% feature match.",
      weight: "High Impact"
    },
    {
      id: 2,
      title: "Satellite Evidence Consistent",
      description: "Sentinel-2 Multi-Spectral Instrument (MSI) shows 10m spatial resolution reflectance shift post geotagged date.",
      weight: "High Impact"
    },
    {
      id: 3,
      title: "Location Within Intervention Zone",
      description: "Geotag coordinates fall directly inside Micro-Watershed Catchment Zone AP-CH-04B designated for check dams.",
      weight: "Medium Impact"
    }
  ],
  technicalMetrics: [
    { label: "Catchment Area", value: "14.2 ha" },
    { label: "Storage Capacity Est.", value: "4,500 m³" },
    { label: "Precipitation Index (SPI)", value: "+1.2 (Moderate Rain)" },
    { label: "Soil Retention Factor", value: "Clay Loam (Class C)" }
  ]
};

export const MOCK_VERIFICATION_QUEUE = [
  {
    id: "GW-1042",
    type: "Check Dam",
    issue: "Satellite mismatch",
    location: "Chittoor",
    subbasin: "Sub-basin 4B",
    priority: "High",
    submitter: "Asha Patil",
    date: "2026-09-05",
    status: "Pending Triage",
    assignedOfficer: "Unassigned"
  },
  {
    id: "GW-1048",
    type: "Farm Pond",
    issue: "Low confidence photo",
    location: "Anantapur",
    subbasin: "Penna Basin",
    priority: "Medium",
    submitter: "Ramesh Kumar",
    date: "2026-09-04",
    status: "In Review",
    assignedOfficer: "Officer P. Rao"
  },
  {
    id: "GW-1057",
    type: "Gully Plug",
    issue: "Erosion change detected",
    location: "Kurnool",
    subbasin: "Nandyal Zone",
    priority: "Medium",
    submitter: "K. Reddy",
    date: "2026-09-05",
    status: "Pending Triage",
    assignedOfficer: "Unassigned"
  },
  {
    id: "GW-1033",
    type: "Contour Trench",
    issue: "Routine validation",
    location: "Kurnool",
    subbasin: "Sub-basin 2A",
    priority: "Low",
    submitter: "Sita Devi",
    date: "2026-09-02",
    status: "Verified",
    assignedOfficer: "Officer M. Rao"
  },
  {
    id: "GW-1061",
    type: "Percolation Tank",
    issue: "Boundary overlap warning",
    location: "Kadapa",
    subbasin: "Rayachoti Block",
    priority: "High",
    submitter: "Asha Patil",
    date: "2026-09-06",
    status: "Flagged",
    assignedOfficer: "Officer S. Naidu"
  },
  {
    id: "GW-1064",
    type: "Check Dam",
    issue: "Duplicate geotag suspected",
    location: "Chittoor",
    subbasin: "Sub-basin 4C",
    priority: "Low",
    submitter: "Venkat S.",
    date: "2026-09-06",
    status: "Pending Triage",
    assignedOfficer: "Unassigned"
  }
];

export const MOCK_ANALYTICS_DATA = {
  summaryCards: [
    { label: "Total Watershed Area", value: "48,250 ha", note: "Across 14 micro-basins" },
    { label: "Annual Runoff Retained", value: "3.42 MCM", note: "+14% vs baseline 2024" },
    { label: "Groundwater Table Delta", value: "+1.85 m", note: "Average rise across AP pilot" },
    { label: "Active Jal Saheli Cadre", value: "312 Members", note: "98.4% active submission rate" }
  ],
  recommendation: {
    title: "AI Hydro-Spatial Recommendation",
    recommendedIntervention: "Farm Pond",
    suitability: "87%",
    location: "Anantapur Sector 7B • Micro-basin AP-AN-07",
    estimatedCost: "₹1,45,000",
    waterYieldEst: "8,500 m³/year",
    reasons: [
      "High surface runoff potential (Curviness coefficient 0.42, Slope 4.8%)",
      "Suitable clay-rich soil terrain with minimal seepage losses",
      "Historical data shows 94% success rate for 8 similar farm ponds within 5km radius"
    ],
    xaiInsight: "Self-Learning Model (GeoBrain-v3) aggregated 3 years of SAR soil moisture retention curves and Sentinel-2 NDWI peaks to score this site in top 95th percentile for groundwater recharge yield."
  }
};

export const MOCK_JAL_SAHELI_PROFILE = {
  name: "Asha Patil",
  role: "Lead Jal Saheli • Community Water Champion",
  village: "Palamaner, Chittoor District, AP",
  phone: "+91 98765 43210",
  memberSince: "March 2024",
  submissions: 148,
  verified: 137,
  accuracy: "92.6%",
  demoEarnings: "₹2,740",
  badge: "Platinum Verifier",
  recentSubmissions: [
    { id: "GW-1042", type: "Check Dam", date: "Sep 05, 2026", status: "Flagged", earnings: "₹20 (Pending)" },
    { id: "GW-1012", type: "Percolation Tank", date: "Aug 30, 2026", status: "Verified", earnings: "₹25" },
    { id: "GW-0988", type: "Contour Trench", date: "Aug 22, 2026", status: "Verified", earnings: "₹20" },
    { id: "GW-0951", type: "Gully Plug", date: "Aug 15, 2026", status: "Verified", earnings: "₹15" }
  ],
  telegramDemoStep: {
    botName: "@GeoWise_Bot",
    userMessage: "📸 [Photo attached] Geotag: 13.2172, 79.1003. Check dam finished at Palamaner.",
    botReply: "✅ Submission GW-1042 received! AI vision processing running...\n🛰️ Sentinel-2 cross-validation initiated.\n💰 Potential incentive: ₹20 credited upon officer triage."
  }
};

export const MOCK_SETTINGS = {
  userRole: "District Officer",
  region: "Andhra Pradesh • Pilot Region",
  language: "English (US)",
  alertThreshold: "High & Medium Priority",
  satellitePassInterval: "Sentinel-2 (5 Days)",
  emailNotifications: true,
  telegramAlerts: true
};
