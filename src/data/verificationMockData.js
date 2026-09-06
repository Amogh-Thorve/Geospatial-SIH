/**
 * verificationMockData.js
 *
 * TEMPORARY DEVELOPMENT DATA — DO NOT USE IN PRODUCTION
 * ─────────────────────────────────────────────────────
 * This file exists ONLY to allow the Verification Queue UI to be developed
 * and visually tested before a real backend is available.
 *
 * INTEGRATION PLAN:
 *   When a real backend is ready, remove this file entirely and update
 *   useVerificationCases() in VerificationQueue.jsx to fetch from the real API.
 *
 * DATA CONTRACT (what the real API must return for each case):
 *   See VerificationCase shape below.
 *
 * Realistic Indian geospatial watershed intervention data.
 * All names, case IDs, and locations are fictional.
 */

/**
 * VerificationCase — data contract the UI depends on.
 *
 * @typedef {Object} VerificationCase
 * @property {string}   id                 — Unique case identifier (e.g. "VQ-2041")
 * @property {string}   priority           — "HIGH" | "MEDIUM" | "LOW" | "AUTO_CLEARED"
 * @property {string}   status             — "PENDING" | "ASSIGNED" | "IN_FIELD" | "REQUIRES_REVIEW" | "AUTO_CLEARED" | "VERIFIED" | "REJECTED"
 * @property {string}   title              — Human-readable case title
 * @property {string}   intervention       — Intervention type (e.g. "Check Dam", "Farm Pond")
 * @property {Object}   location
 * @property {string}   location.village   — Village / mandal name
 * @property {string}   location.district  — District name
 * @property {string}   location.state     — State name
 * @property {string}   submittedAt        — ISO 8601 timestamp
 * @property {number}   aiConfidence       — 0–100 (percentage from AI model)
 * @property {number}   riskScore          — 0–100 (composite risk/urgency score)
 * @property {string}   triageReason       — One-sentence summary of why this was prioritized
 * @property {string[]} reasons            — 2–4 human-readable factor bullets
 * @property {string}   recommendedAction  — Actionable instruction for field officer
 * @property {string|null} assignedOfficer — Officer name, or null if unassigned
 */

export const VERIFICATION_CASES = [
  // ── HIGH PRIORITY ─────────────────────────────────────────────────────────

  {
    id: 'VQ-2041',
    priority: 'HIGH',
    status: 'PENDING',
    title: 'Check Dam — Sub-basin 7C',
    intervention: 'Check Dam',
    location: { village: 'Vadali', district: 'Sabarkantha', state: 'Gujarat' },
    submittedAt: '2026-09-06T05:14:00Z',
    aiConfidence: 61,
    riskScore: 88,
    triageReason:
      'Satellite imagery shows no excavation or masonry signature at the submitted coordinates. Location appears to be a dry field, not a stream channel.',
    reasons: [
      'Possible location mismatch detected by satellite cross-validation',
      'AI confidence critically low (61%) — structural evidence missing',
      'Check dam in this sub-basin has high catchment impact (14.2 ha)',
    ],
    recommendedAction: 'Immediate field verification',
    assignedOfficer: null,
  },

  {
    id: 'VQ-2042',
    priority: 'HIGH',
    status: 'ASSIGNED',
    title: 'Farm Pond Excavation — Malpura Block',
    intervention: 'Farm Pond',
    location: { village: 'Khirot', district: 'Tonk', state: 'Rajasthan' },
    submittedAt: '2026-09-05T10:30:00Z',
    aiConfidence: 54,
    riskScore: 93,
    triageReason:
      'Multi-temporal SAR backscatter shows no soil disturbance consistent with excavation. Photo metadata timestamps conflict with the stated completion date.',
    reasons: [
      'Very low AI confidence (54%) — model cannot confirm excavation',
      'Photo EXIF timestamp is 11 days prior to submission date',
      'No NDWI shift detected in Sentinel-2 — no water accumulation',
      'High intervention impact (₹1.4L NREGA expenditure at risk)',
    ],
    recommendedAction: 'Immediate field verification',
    assignedOfficer: 'R. S. Sharma',
  },

  {
    id: 'VQ-2043',
    priority: 'HIGH',
    status: 'REQUIRES_REVIEW',
    title: 'Percolation Tank — Georai Mandal',
    intervention: 'Percolation Tank',
    location: { village: 'Wadgaon Tanda', district: 'Beed', state: 'Maharashtra' },
    submittedAt: '2026-09-04T14:00:00Z',
    aiConfidence: 68,
    riskScore: 79,
    triageReason:
      'Spectral analysis detects a significant NDWI shift, but the location falls partially outside the designated micro-watershed boundary. An environmental anomaly flag was raised.',
    reasons: [
      'Geotag coordinates partially outside designated watershed boundary',
      'Environmental anomaly: vegetation stress detected in adjacent zone',
      'Moderate AI confidence (68%) requires human validation',
    ],
    recommendedAction: 'Field verification + boundary re-measurement',
    assignedOfficer: 'P. G. Kulkarni',
  },

  {
    id: 'VQ-2044',
    priority: 'HIGH',
    status: 'IN_FIELD',
    title: 'Continuous Contour Trenching — Hatta Block',
    intervention: 'Contour Trenching',
    location: { village: 'Semra Khurd', district: 'Damoh', state: 'Madhya Pradesh' },
    submittedAt: '2026-09-03T08:00:00Z',
    aiConfidence: 71,
    riskScore: 83,
    triageReason:
      'High-impact intervention in a drought-stressed sub-basin. AI detects trench line partially misaligned with slope contours, which could redirect runoff harmfully.',
    reasons: [
      'Trench alignment deviates from optimal contour line (est. 12° error)',
      'High-impact intervention in drought-critical zone — failure risk elevated',
      'Moderate AI confidence (71%) on terrain feature detection',
    ],
    recommendedAction: 'Verify trench alignment against DEM contours',
    assignedOfficer: 'V. K. Tiwari',
  },

  // ── MEDIUM PRIORITY ────────────────────────────────────────────────────────

  {
    id: 'VQ-2045',
    priority: 'MEDIUM',
    status: 'PENDING',
    title: 'Gully Plug — Mulbagal Taluk',
    intervention: 'Gully Plug',
    location: { village: 'Devarakaggalahalli', district: 'Kolar', state: 'Karnataka' },
    submittedAt: '2026-09-05T08:00:00Z',
    aiConfidence: 78,
    riskScore: 61,
    triageReason:
      'AI confidence is within acceptable range, but field photo quality is insufficient for structural verification. Missing cross-section evidence.',
    reasons: [
      'Ground photo resolution too low for structural analysis',
      'Missing cross-section and downstream view required by protocol',
      'Moderate confidence (78%) — evidence gap needs field closure',
    ],
    recommendedAction: 'Standard field verification with photo protocol',
    assignedOfficer: null,
  },

  {
    id: 'VQ-2046',
    priority: 'MEDIUM',
    status: 'PENDING',
    title: 'Farm Bund — Devarakonda Mandal',
    intervention: 'Farm Bund',
    location: { village: 'Nagulapally', district: 'Nalgonda', state: 'Telangana' },
    submittedAt: '2026-09-05T16:00:00Z',
    aiConfidence: 75,
    riskScore: 58,
    triageReason:
      'Moderate environmental anomaly in adjacent field. Bund length submitted (210 m) is significantly higher than satellite-estimated earthwork extent (138 m).',
    reasons: [
      'Bund length discrepancy: submitted 210 m vs satellite estimate 138 m',
      'Moderate AI confidence (75%) on earthwork extent detection',
      'Minor soil erosion anomaly in adjacent parcel (unrelated but flagged)',
    ],
    recommendedAction: 'Field measurement of bund length and height',
    assignedOfficer: null,
  },

  {
    id: 'VQ-2047',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    title: 'Check Dam — Rayagada Block',
    intervention: 'Check Dam',
    location: { village: 'Muniguda', district: 'Rayagada', state: 'Odisha' },
    submittedAt: '2026-09-04T06:00:00Z',
    aiConfidence: 82,
    riskScore: 65,
    triageReason:
      'Photo evidence is incomplete — only upstream face photographed. Spillway and downstream apron are not visible. AI can confirm site presence but not structural completeness.',
    reasons: [
      'Downstream apron and spillway not photographed',
      'Photo evidence incomplete per PMKSY verification protocol',
      'AI confidence (82%) indicates site is real but structural quality unknown',
    ],
    recommendedAction: 'Field verification — check dam structural completeness',
    assignedOfficer: 'B. K. Mishra',
  },

  {
    id: 'VQ-2048',
    priority: 'MEDIUM',
    status: 'IN_FIELD',
    title: 'Nala Bund — Nandyal Sub-basin',
    intervention: 'Nala Bund',
    location: { village: 'Banaganapalle', district: 'Kurnool', state: 'Andhra Pradesh' },
    submittedAt: '2026-09-03T12:00:00Z',
    aiConfidence: 80,
    riskScore: 67,
    triageReason:
      'Moderate upstream sediment accumulation anomaly detected post-bund construction. Possible premature siltation that could reduce storage capacity within the first monsoon season.',
    reasons: [
      'Upstream sediment anomaly — early siltation risk within 3 months',
      'Bund crest level appears below design specification (satellite DEM analysis)',
      'Moderate AI confidence (80%) on hydrological anomaly detection',
    ],
    recommendedAction: 'Field inspection of bund crest level and siltation',
    assignedOfficer: 'D. V. Reddy',
  },

  // ── LOW PRIORITY ───────────────────────────────────────────────────────────

  {
    id: 'VQ-2049',
    priority: 'LOW',
    status: 'PENDING',
    title: 'Percolation Tank — Bilaspur Block',
    intervention: 'Percolation Tank',
    location: { village: 'Belha', district: 'Bilaspur', state: 'Chhattisgarh' },
    submittedAt: '2026-09-04T10:00:00Z',
    aiConfidence: 89,
    riskScore: 34,
    triageReason:
      'Strong model confidence with consistent satellite evidence. Routine verification scheduled at next district officer visit.',
    reasons: [
      'High AI confidence (89%) — NDWI confirms water retention pattern',
      'Location within designated micro-watershed zone',
      'Photo evidence complete and consistent with site',
    ],
    recommendedAction: 'Routine verification — include in next field visit',
    assignedOfficer: null,
  },

  {
    id: 'VQ-2050',
    priority: 'LOW',
    status: 'ASSIGNED',
    title: 'Contour Bund — Mandi District',
    intervention: 'Contour Bund',
    location: { village: 'Thunag', district: 'Mandi', state: 'Himachal Pradesh' },
    submittedAt: '2026-09-02T07:00:00Z',
    aiConfidence: 91,
    riskScore: 28,
    triageReason:
      'Very high model confidence. Spectral and structural signatures are consistent. Low intervention impact — desk review recommended before field visit.',
    reasons: [
      'Strong AI confidence (91%) — contour alignment verified by DEM',
      'Satellite evidence fully consistent with submitted photos',
      'Low intervention scale — estimated earthwork 450 m²',
    ],
    recommendedAction: 'Desk review — field visit not urgent',
    assignedOfficer: 'H. R. Thakur',
  },

  // ── AUTO-CLEARED ───────────────────────────────────────────────────────────

  {
    id: 'VQ-2051',
    priority: 'AUTO_CLEARED',
    status: 'AUTO_CLEARED',
    title: 'Farm Pond — Ludhiana Rural Block',
    intervention: 'Farm Pond',
    location: { village: 'Sahnewal', district: 'Ludhiana', state: 'Punjab' },
    submittedAt: '2026-09-01T09:00:00Z',
    aiConfidence: 96,
    riskScore: 12,
    triageReason:
      'Very high AI confidence across all modalities. Sentinel-2 confirms water body formation. No human verification required under auto-clearance protocol.',
    reasons: [
      'Very high confidence (96%) — multi-modal evidence fully consistent',
      'Sentinel-2 NDWI confirms farm pond with 4,200 m³ estimated storage',
      'Geotag within 8 m of actual pond centre — GPS accuracy confirmed',
      'Submitter reliability score: 98.1% — Platinum Verifier',
    ],
    recommendedAction: 'No field visit required — auto-cleared',
    assignedOfficer: null,
  },

  {
    id: 'VQ-2052',
    priority: 'AUTO_CLEARED',
    status: 'AUTO_CLEARED',
    title: 'Check Dam — Jhansi Block',
    intervention: 'Check Dam',
    location: { village: 'Moth', district: 'Jhansi', state: 'Uttar Pradesh' },
    submittedAt: '2026-08-31T12:00:00Z',
    aiConfidence: 97,
    riskScore: 8,
    triageReason:
      'Highest confidence classification. Multi-temporal SAR and optical data confirm check dam construction with full structural evidence. Auto-cleared without human review.',
    reasons: [
      'Near-perfect confidence (97%) — highest model certainty class',
      'SAR backscatter change fully consistent with masonry construction',
      'Photo metadata, GPS, and satellite timestamps all corroborate',
    ],
    recommendedAction: 'No field visit required — auto-cleared',
    assignedOfficer: null,
  },
];
