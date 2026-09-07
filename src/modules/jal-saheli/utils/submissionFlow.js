/**
 * submissionFlow.js
 * Central state machine for the Jal Saheli observation submission flow.
 *
 * UI components must NOT contain their own setTimeout chains or ad-hoc status logic.
 * All flow transitions, delays, and deterministic demo results live here.
 *
 * State machine:
 *   idle → photo_uploaded → location_set → submitted
 *        → ai_processing → ai_complete
 *        → satellite_processing → satellite_complete
 *        → verified | rejected | failed
 *        → earnings_added
 *
 * Usage:
 *   import { SUBMISSION_STATES, FLOW_STEPS, runDemoFlow } from '../utils/submissionFlow';
 */

// ---------------------------------------------------------------------------
// 1. State definitions
// ---------------------------------------------------------------------------

export const SUBMISSION_STATES = {
  IDLE: 'idle',
  PHOTO_UPLOADED: 'photo_uploaded',
  LOCATION_SET: 'location_set',
  SUBMITTED: 'submitted',
  PHOTO_RECEIVED: 'photo_received',
  AI_PROCESSING: 'ai_processing',
  AI_COMPLETE: 'ai_complete',
  SATELLITE_PROCESSING: 'satellite_processing',
  SATELLITE_COMPLETE: 'satellite_complete',
  FINAL_VERIFICATION: 'final_verification',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  FAILED: 'failed',
  EARNINGS_ADDED: 'earnings_added',
};

// States where the form/UI should be locked (processing in progress)
export const LOCKED_STATES = new Set([
  SUBMISSION_STATES.SUBMITTED,
  SUBMISSION_STATES.PHOTO_RECEIVED,
  SUBMISSION_STATES.AI_PROCESSING,
  SUBMISSION_STATES.AI_COMPLETE,
  SUBMISSION_STATES.SATELLITE_PROCESSING,
  SUBMISSION_STATES.SATELLITE_COMPLETE,
  SUBMISSION_STATES.FINAL_VERIFICATION,
]);

// States that represent a terminal outcome
export const TERMINAL_STATES = new Set([
  SUBMISSION_STATES.VERIFIED,
  SUBMISSION_STATES.REJECTED,
  SUBMISSION_STATES.FAILED,
  SUBMISSION_STATES.EARNINGS_ADDED,
]);

// ---------------------------------------------------------------------------
// 2. Visual flow steps (drives FlowProgress component)
// ---------------------------------------------------------------------------

export const FLOW_STEPS = [
  {
    id: 'photo',
    label: '📷 Photo',
    labelMarathi: '📷 फोटो',
    labelHindi: '📷 फोटो',
    activeIn: [
      SUBMISSION_STATES.PHOTO_UPLOADED,
      SUBMISSION_STATES.LOCATION_SET,
    ],
    completedIn: [
      SUBMISSION_STATES.SUBMITTED,
      SUBMISSION_STATES.PHOTO_RECEIVED,
      SUBMISSION_STATES.AI_PROCESSING,
      SUBMISSION_STATES.AI_COMPLETE,
      SUBMISSION_STATES.SATELLITE_PROCESSING,
      SUBMISSION_STATES.SATELLITE_COMPLETE,
      SUBMISSION_STATES.FINAL_VERIFICATION,
      SUBMISSION_STATES.VERIFIED,
      SUBMISSION_STATES.REJECTED,
      SUBMISSION_STATES.EARNINGS_ADDED,
    ],
  },
  {
    id: 'ai',
    label: '🤖 AI Vision',
    labelMarathi: '🤖 एआय',
    labelHindi: '🤖 एआई',
    activeIn: [
      SUBMISSION_STATES.SUBMITTED,
      SUBMISSION_STATES.PHOTO_RECEIVED,
      SUBMISSION_STATES.AI_PROCESSING,
    ],
    completedIn: [
      SUBMISSION_STATES.AI_COMPLETE,
      SUBMISSION_STATES.SATELLITE_PROCESSING,
      SUBMISSION_STATES.SATELLITE_COMPLETE,
      SUBMISSION_STATES.FINAL_VERIFICATION,
      SUBMISSION_STATES.VERIFIED,
      SUBMISSION_STATES.REJECTED,
      SUBMISSION_STATES.EARNINGS_ADDED,
    ],
  },
  {
    id: 'satellite',
    label: '🛰 Satellite',
    labelMarathi: '🛰 उपग्रह',
    labelHindi: '🛰 सैटेलाइट',
    activeIn: [
      SUBMISSION_STATES.AI_COMPLETE,
      SUBMISSION_STATES.SATELLITE_PROCESSING,
    ],
    completedIn: [
      SUBMISSION_STATES.SATELLITE_COMPLETE,
      SUBMISSION_STATES.FINAL_VERIFICATION,
      SUBMISSION_STATES.VERIFIED,
      SUBMISSION_STATES.REJECTED,
      SUBMISSION_STATES.EARNINGS_ADDED,
    ],
  },
  {
    id: 'verified',
    label: '✓ Verified',
    labelMarathi: '✓ सत्यापित',
    labelHindi: '✓ सत्यापित',
    activeIn: [
      SUBMISSION_STATES.SATELLITE_COMPLETE,
      SUBMISSION_STATES.FINAL_VERIFICATION,
    ],
    completedIn: [
      SUBMISSION_STATES.VERIFIED,
      SUBMISSION_STATES.EARNINGS_ADDED,
    ],
  },
  {
    id: 'earnings',
    label: '💰 Earnings',
    labelMarathi: '💰 उत्पन्न',
    labelHindi: '💰 कमाई',
    activeIn: [
      SUBMISSION_STATES.VERIFIED,
    ],
    completedIn: [
      SUBMISSION_STATES.EARNINGS_ADDED,
    ],
  },
];

// ---------------------------------------------------------------------------
// 3. Deterministic demo result
// These are the fixed values shown at the end of every demo run.
// Replace with real API results when backend/AI is connected.
// ---------------------------------------------------------------------------

export const DEMO_RESULT = {
  observationType: 'Water Body',   // Shown when no type selected
  location: 'Field Location',
  aiConfidence: 92,
  aiConfidenceDisplay: '92%',
  satelliteConfidence: 96,
  satelliteConfidenceDisplay: '96%',
  finalConfidence: 95,
  finalConfidenceDisplay: '95%',
  status: 'verified',
  reward: 25,
  rewardDisplay: '₹25',
  submissionId: null, // set at runtime (e.g. 'GW-' + timestamp)

  // AI classification detail
  aiClassification: {
    label: 'Water Body Detected',
    reasons: [
      'High NDWI spectral signature consistent with open water surface',
      'Shoreline boundary detected with 94% edge-feature confidence',
      'Seasonal water accumulation pattern matches monsoon inflow model',
    ],
  },

  // Satellite result detail
  satelliteResult: {
    source: 'Sentinel-2 L2A (10m resolution)',
    band: 'B3/B8 NDWI composite',
    ndwiDelta: '+0.38',
    changeDetected: true,
    label: 'Water Body Confirmed',
  },

  // Multilingual final result
  resultText: {
    en: 'Your observation has been verified. The water body is confirmed by both AI and Sentinel-2 satellite imagery.',
    mr: 'तुमचे निरीक्षण सत्यापित झाले आहे. एआय आणि सेंटिनेल-२ उपग्रह प्रतिमा दोन्हींद्वारे जलाशयाची पुष्टी झाली आहे.',
    hi: 'आपका अवलोकन सत्यापित हो गया है। एआई और सेंटिनल-2 उपग्रह चित्रों दोनों द्वारा जल निकाय की पुष्टि की गई है।',
  },
};

// ---------------------------------------------------------------------------
// 4. Timing constants (all in milliseconds)
// ---------------------------------------------------------------------------

export const DEMO_DELAYS = {
  SUBMIT_TO_PHOTO_RECEIVED: 500,     // Photo payload received on server
  PHOTO_TO_AI_GAP: 500,              // Handover to GeoBrain-v3 AI model
  AI_PROCESSING_DURATION: 1800,      // AI vision inference
  AI_TO_SAT_GAP: 600,               // Handover to Sentinel-2 satellite audit
  SAT_PROCESSING_DURATION: 1800,     // Sentinel-2 spectral & NDWI analysis
  SAT_TO_FINAL_GAP: 500,             // Consensus & correlation synthesis
  FINAL_VERIFICATION_DURATION: 800,  // Final score resolution
  VERIFIED_TO_EARNINGS: 700,        // Incentive credited
};

// Total approximate flow time: 7.2 seconds (within 5–8 second target)

// ---------------------------------------------------------------------------
// 5. Flow runner
// Accepts dispatch and payload, drives deterministic demo sequence.
// Returns a cancel() function to abort pending timers.
// ---------------------------------------------------------------------------

/**
 * runDemoFlow(dispatch, payloadOrType, rewardArg, onCompleteArg)
 *
 * Sequence:
 *   SUBMIT → PHOTO_RECEIVED → AI_PROCESSING → AI_COMPLETE →
 *   SATELLITE_PROCESSING → SATELLITE_COMPLETE → FINAL_VERIFICATION →
 *   VERIFIED → EARNINGS_ADDED
 */
/**
 * Drive UI states from a persisted backend analysis (no fake NDVI/confidence).
 * Returns a cancel() function.
 */
export function runLiveAnalysisFlow(dispatch, payload = {}, onCompleteArg = null) {
  const timers = [];
  const after = (ms, fn) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  };
  const cancel = () => timers.forEach(clearTimeout);

  const submissionId = payload.submissionId;
  const fetchAnalysis = payload.fetchAnalysis;
  const observationType = payload.observationType || 'Water Body';
  const location = payload.location;
  const photo = payload.photo;
  const onComplete = typeof onCompleteArg === 'function' ? onCompleteArg : payload.onComplete;
  const typeLabel = typeof observationType === 'object' ? (observationType.label || 'Observation') : observationType;
  const typeId = typeof observationType === 'object' ? (observationType.id || 'observation') : 'observation';

  after(200, () => {
    dispatch({ type: 'SET_STATE', state: SUBMISSION_STATES.PHOTO_RECEIVED });
    after(200, () => {
      dispatch({ type: 'SET_STATE', state: SUBMISSION_STATES.AI_PROCESSING });
      after(200, () => {
        dispatch({ type: 'SET_STATE', state: SUBMISSION_STATES.SATELLITE_PROCESSING });
        Promise.resolve()
          .then(() => (fetchAnalysis ? fetchAnalysis() : Promise.reject(new Error('No analysis fetcher'))))
          .then((analysis) => {
            const unavailable = !analysis || analysis.status === 'UNAVAILABLE' || analysis.satellite_match === 'UNAVAILABLE';
            const conf = analysis?.confidence;
            const confPct = conf == null ? null : (conf <= 1 ? Math.round(conf * 100) : Math.round(conf));
            const verificationResult = {
              submissionId,
              observationType: typeLabel,
              available: !unavailable,
              status: unavailable ? 'unavailable' : (analysis.submission_status || analysis.status),
              provider: analysis?.provider,
              classification: analysis?.classification || analysis?.lulc || '',
              lulc: analysis?.lulc,
              ndvi: analysis?.ndvi,
              ndwi: analysis?.ndwi,
              ndviSource: analysis?.ndvi_source,
              ndwiSource: analysis?.ndwi_source,
              satelliteMatch: analysis?.satellite_match,
              satelliteImageryProvider: analysis?.satellite_imagery_provider,
              satelliteImageryType: analysis?.satellite_imagery_type,
              bhuvan: analysis?.bhuvan,
              aiConfidence: confPct,
              satelliteConfidence: confPct,
              finalConfidence: confPct,
              changeDetection: analysis?.change_detection,
              recommendation: analysis?.recommendation,
              message: unavailable ? (analysis?.change_detection || 'Geo AI unavailable') : null,
            };
            dispatch({
              type: unavailable ? 'SET_FAILED' : 'SET_VERIFIED',
              state: unavailable ? SUBMISSION_STATES.FAILED : SUBMISSION_STATES.VERIFIED,
              verificationResult,
              reward: 0,
            });
            const finalSubmission = {
              id: submissionId,
              type: typeId,
              typeLabel,
              status: unavailable ? 'unavailable' : 'analyzed',
              aiConfidence: confPct,
              satelliteConfidence: confPct,
              finalConfidence: confPct,
              reward: 0,
              verificationResult,
              location: location || { label: 'Field Location', lat: null, lng: null },
              photoUrl: photo?.previewUrl || null,
            };
            dispatch({
              type: 'SET_EARNINGS',
              state: unavailable ? SUBMISSION_STATES.FAILED : SUBMISSION_STATES.EARNINGS_ADDED,
              reward: 0,
              finalSubmission,
            });
            if (onComplete) onComplete(finalSubmission);
          })
          .catch((err) => {
            dispatch({
              type: 'SET_FAILED',
              state: SUBMISSION_STATES.FAILED,
              verificationResult: {
                submissionId,
                available: false,
                status: 'unavailable',
                message: err?.message || 'Geo AI unavailable',
              },
              reward: 0,
            });
          });
      });
    });
  });

  return cancel;
}

/**
 * @deprecated Use runLiveAnalysisFlow. Kept as an alias so existing imports keep working.
 */
export function runDemoFlow(dispatch, payloadOrType = {}, rewardArg = 0, onCompleteArg = null) {
  let payload = payloadOrType;
  let onComplete = onCompleteArg;
  if (typeof payloadOrType !== 'object' || payloadOrType == null || payloadOrType.label) {
    payload = { observationType: payloadOrType, reward: rewardArg };
    onComplete = onCompleteArg;
  } else if (typeof rewardArg === 'function') {
    onComplete = rewardArg;
  }
  return runLiveAnalysisFlow(dispatch, payload, onComplete);
}

// ---------------------------------------------------------------------------
// 6. Reducer for submission state
// Use with React.useReducer in SubmitObservation page.
// ---------------------------------------------------------------------------

export const initialFlowState = {
  status: SUBMISSION_STATES.IDLE,
  photo: null,          // { file, previewUrl, name }
  location: null,       // { lat, lng, label }
  observationType: null,// observation type object or string
  submissionId: null,   // generated on submit
  reward: 0,            // INR integer
  language: 'en',       // 'en' | 'mr' | 'hi'
  verificationResult: null,
  finalSubmission: null,
};

export function flowReducer(state, action) {
  switch (action.type) {
    case 'SET_PHOTO':
      return {
        ...state,
        photo: action.photo,
        status: SUBMISSION_STATES.PHOTO_UPLOADED,
      };

    case 'CLEAR_PHOTO':
      return {
        ...state,
        photo: null,
        status: SUBMISSION_STATES.IDLE,
      };

    case 'SET_LOCATION':
      return {
        ...state,
        location: action.location,
        status: state.photo
          ? SUBMISSION_STATES.LOCATION_SET
          : state.status,
      };

    case 'SET_OBSERVATION_TYPE':
      return {
        ...state,
        observationType: action.observationType,
      };

    case 'SUBMIT':
      return {
        ...state,
        status: SUBMISSION_STATES.SUBMITTED,
        submissionId: action.submissionId,
      };

    case 'SET_STATE':
      return {
        ...state,
        status: action.state,
      };

    case 'SET_FAILED':
      return {
        ...state,
        status: action.state || SUBMISSION_STATES.FAILED,
        verificationResult: action.verificationResult,
        reward: action.reward ?? 0,
      };

    case 'SET_VERIFIED':
      return {
        ...state,
        status: SUBMISSION_STATES.VERIFIED,
        verificationResult: action.verificationResult,
        reward: action.reward ?? state.reward,
      };

    case 'SET_EARNINGS':
      return {
        ...state,
        status: action.state || SUBMISSION_STATES.EARNINGS_ADDED,
        reward: action.reward ?? state.reward,
        finalSubmission: action.finalSubmission || state.finalSubmission,
      };

    case 'SET_LANGUAGE':
      return {
        ...state,
        language: action.language,
      };

    case 'RESET':
      return {
        ...initialFlowState,
        language: state.language, // preserve language preference
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// 7. Helper: generate a new submission ID
// ---------------------------------------------------------------------------

export function generateSubmissionId() {
  const ts = Date.now().toString().slice(-5);
  return `GW-${ts}`;
}
