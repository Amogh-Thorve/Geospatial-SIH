/**
 * mockProfile.js
 * In-memory profile schema & session store for the Jal Saheli field worker.
 *
 * In production:
 *   GET /api/jal-saheli/profile
 *
 * This provides the baseline data shape for when an external backend is not yet connected.
 * Stats start clean (0 submissions, null accuracy) and update dynamically in-session as
 * the field worker verifies observations.
 */

export const MOCK_PROFILE = {
  id: 'JS-CADRE',
  name: 'Jal Saheli',
  nameMarathi: 'जल सहेली',
  nameHindi: 'जल सहेली',
  role: 'Community Water Champion • Field Cadre',
  roleMarathi: 'सामुदायिक जल चॅम्पियन • क्षेत्रीय संवर्ग',
  roleHindi: 'सामुदायिक जल चैंपियन • फील्ड कैडर',
  village: 'Watershed Cluster',
  villageMarathi: 'पाणलोट क्षेत्र',
  villageHindi: 'जलग्रहण क्षेत्र',
  phone: '+91 ••••• •••••',
  telegramHandle: '@JalSaheliCadre',
  memberSince: '2026',
  memberSinceMarathi: '२०२६',
  memberSinceHindi: '2026',

  // Initials for avatar
  initials: 'JS',

  // Cadre badge level
  badge: 'Active Verifier',
  badgeMarathi: 'सक्रिय पडताळणीकर्ता',
  badgeHindi: 'सक्रिय सत्यापनकर्ता',

  // Real-time aggregate statistics (starts clean, incremented by recordSubmission in-session)
  stats: {
    totalSubmissions: 0,
    verifiedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    accuracyRate: null,         // null when insufficient data (<3 verifications)
    accuracyRateDisplay: null,  // rendered as "Not enough data" or "Accuracy unavailable"
    totalEarningsRaw: 0,        // in INR
    totalEarningsDisplay: '₹0',
    streakDays: 0,
    rank: null,                 // unranked until verified submissions threshold met
    rankOf: null,
  },

  // Accuracy history sparkline entries: [{ label: string, score: number }]
  accuracyHistory: [],

  // No fake default GPS location — real geolocation must be requested from the browser
  defaultLocation: null,
};
