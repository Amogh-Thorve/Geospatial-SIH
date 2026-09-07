/**
 * mockSubmissions.js
 * In-memory session store & category definitions for Jal Saheli field observations.
 *
 * In production:
 *   GET  /api/jal-saheli/submissions
 *   POST /api/jal-saheli/submissions
 *
 * Starts with an empty submission list (`[]`) representing a clean state.
 * When an observation is submitted in the session, `recordSubmission()` in `jalSaheliApi.js`
 * dynamically adds the record here so submission & verification history reflect real activity.
 */

// ---------------------------------------------------------------------------
// Observation types used in the submission FORM (5 standard categories)
// ---------------------------------------------------------------------------
export const FORM_OBSERVATION_TYPES = [
  {
    id: 'water_body',
    label: 'Water Body',
    labelMarathi: 'जलाशय',
    labelHindi: 'जल निकाय',
    description: 'Pond, lake, reservoir, or seasonal water collection',
    emoji: '🌊',
    reward: 25,
  },
  {
    id: 'groundwater',
    label: 'Groundwater',
    labelMarathi: 'भूजल',
    labelHindi: 'भूजल',
    description: 'Borewell, hand-pump, or underground water source',
    emoji: '💧',
    reward: 20,
  },
  {
    id: 'irrigation',
    label: 'Irrigation',
    labelMarathi: 'सिंचन',
    labelHindi: 'सिंचाई',
    description: 'Canal, pipeline, or drip irrigation infrastructure',
    emoji: '🌾',
    reward: 20,
  },
  {
    id: 'water_quality',
    label: 'Water Quality',
    labelMarathi: 'पाण्याची गुणवत्ता',
    labelHindi: 'जल गुणवत्ता',
    description: 'Contamination, discolouration, or quality concern',
    emoji: '🔬',
    reward: 25,
  },
  {
    id: 'other',
    label: 'Other',
    labelMarathi: 'इतर',
    labelHindi: 'अन्य',
    description: 'Any other water-related observation',
    emoji: '📍',
    reward: 15,
  },
];

// ---------------------------------------------------------------------------
// Full observation types list (superset including specialized watershed structures)
// ---------------------------------------------------------------------------
export const OBSERVATION_TYPES = [
  ...FORM_OBSERVATION_TYPES,
  {
    id: 'check_dam',
    label: 'Check Dam',
    labelMarathi: 'चेक डॅम',
    labelHindi: 'चेक डैम',
    description: 'Small barrier built across a drainage channel',
    emoji: '🪨',
    reward: 20,
  },
  {
    id: 'farm_pond',
    label: 'Farm Pond',
    labelMarathi: 'शेततळे',
    labelHindi: 'खेत तालाब',
    description: 'Excavated pond on agricultural land for water storage',
    emoji: '🏞️',
    reward: 25,
  },
  {
    id: 'contour_trench',
    label: 'Contour Trench',
    labelMarathi: 'समपातळी चर',
    labelHindi: 'समोच्च खाई',
    description: 'Horizontal trenches dug along land contours to harvest runoff',
    emoji: '〰️',
    reward: 20,
  },
  {
    id: 'gully_plug',
    label: 'Gully Plug',
    labelMarathi: 'घळई प्लग',
    labelHindi: 'नाला प्लग',
    description: 'Structure to stop soil erosion in small gullies',
    emoji: '🛡️',
    reward: 15,
  },
  {
    id: 'percolation_tank',
    label: 'Percolation Tank',
    labelMarathi: 'भूजल पुनर्भरण टाकी',
    labelHindi: 'परकोलेशन टैंक',
    description: 'Tank to allow water to percolate into groundwater',
    emoji: '🔽',
    reward: 25,
  },
];

// ---------------------------------------------------------------------------
// Historical submissions store — starts empty.
// Populated in real-time when observations are submitted and verified.
// ---------------------------------------------------------------------------
export const MOCK_SUBMISSIONS = [];

// ---------------------------------------------------------------------------
// Verification timeline builder for single submission
// ---------------------------------------------------------------------------
export const buildVerificationTimeline = (submission) => {
  if (!submission) return [];

  return [
    {
      id: 'submitted',
      status: 'done',
      label: 'Submitted',
      labelMarathi: 'सबमिट केले',
      labelHindi: 'जमा किया',
      description: `Observation received via ${submission.channel === 'telegram' ? 'Telegram Bot' : 'Web Form'}`,
      timestamp: submission.date ? `${submission.date} ${submission.timeDisplay || ''}`.trim() : null,
      icon: 'Send',
    },
    {
      id: 'ai_processing',
      status: submission.aiConfidence != null ? 'done' : 'pending',
      label: 'AI Analysis',
      labelMarathi: 'एआय विश्लेषण',
      labelHindi: 'एआई विश्लेषण',
      description: submission.aiConfidence != null
        ? `GeoBrain-v3 classified as ${submission.typeLabel} — ${submission.aiConfidence}% confidence`
        : 'Awaiting AI inference',
      timestamp: null,
      icon: 'Brain',
    },
    {
      id: 'satellite_processing',
      status: submission.satelliteConfidence != null ? 'done' : 'pending',
      label: 'Satellite Cross-check',
      labelMarathi: 'उपग्रह क्रॉस-चेक',
      labelHindi: 'सैटेलाइट क्रॉस-चेक',
      description: submission.satelliteConfidence != null
        ? `Sentinel-2 spectral audit — ${submission.satelliteConfidence}% match`
        : 'Awaiting satellite cross-check',
      timestamp: null,
      icon: 'Satellite',
    },
    {
      id: 'verified',
      status: submission.status === 'verified' ? 'done' : submission.status === 'rejected' ? 'rejected' : 'pending',
      label: submission.status === 'verified' ? 'Verified' : submission.status === 'rejected' ? 'Rejected' : 'Pending Verification',
      labelMarathi: submission.status === 'verified' ? 'सत्यापित' : submission.status === 'rejected' ? 'नाकारले' : 'प्रलंबित',
      labelHindi: submission.status === 'verified' ? 'सत्यापित' : submission.status === 'rejected' ? 'अस्वीकृत' : 'लंबित',
      description: submission.verifiedBy ? `by ${submission.verifiedBy}` : 'Dual-engine consensus verification',
      timestamp: submission.verifiedAt || null,
      icon: submission.status === 'verified' ? 'CheckCircle' : submission.status === 'rejected' ? 'XCircle' : 'Clock',
    },
    {
      id: 'earnings',
      status: (submission.earnings || 0) > 0 ? 'done' : 'skipped',
      label: (submission.earnings || 0) > 0 ? `Earned ${submission.earningsDisplay || `₹${submission.earnings}`}` : 'No Earnings',
      labelMarathi: (submission.earnings || 0) > 0 ? `${submission.earningsDisplay || `₹${submission.earnings}`} मिळाले` : 'उत्पन्न नाही',
      labelHindi: (submission.earnings || 0) > 0 ? `${submission.earningsDisplay || `₹${submission.earnings}`} अर्जित` : 'कोई कमाई नहीं',
      description: (submission.earnings || 0) > 0 ? 'Incentive credited to cadre account' : 'Submission did not qualify',
      timestamp: null,
      icon: 'IndianRupee',
    },
  ];
};
