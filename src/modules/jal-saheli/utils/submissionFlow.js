/**
 * submissionFlow.js
 * Central state machine for the Jal Saheli observation submission flow.
 *
 * UI components must NOT contain their own setTimeout chains or ad-hoc status logic.
 * All flow state transitions and polling logic live here.
 *
 * State machine:
 *   SUBMITTED → AI_PROCESSING → AI_COMPLETE → SATELLITE_PROCESSING
 *   → SATELLITE_COMPLETE → FINAL_VERIFICATION → VERIFIED | REJECTED
 *
 * Integration:
 *   import { SUBMISSION_STATES, FLOW_STEPS, pollVerificationStatus } from '../utils/submissionFlow';
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

// No DEMO_RESULT needed anymore. UI expects real data from backend.
// Real flow timing is dependent on backend processing speed.
// ---------------------------------------------------------------------------
// 5. Flow runner (Polling Backend)
// ---------------------------------------------------------------------------

import { getSubmissionStatus, getSubmissionById } from '../services/jalSaheliApi';

/**
 * Polls the backend status and dispatches updates.
 * Returns a cancel function.
 */
export function pollVerificationStatus(dispatch, submissionId, rewardArg, onComplete) {
  let isCancelled = false;
  let timerId = null;

  async function poll() {
    if (isCancelled) return;
    try {
      const statusRes = await getSubmissionStatus(submissionId);
      
      // Map backend status to flow states
      let mappedState = SUBMISSION_STATES.SUBMITTED;
      if (statusRes.status === 'processing') {
        if (statusRes.satellite_confidence) mappedState = SUBMISSION_STATES.SATELLITE_COMPLETE;
        else if (statusRes.ai_confidence) mappedState = SUBMISSION_STATES.AI_COMPLETE;
        else mappedState = SUBMISSION_STATES.AI_PROCESSING;
      } else if (statusRes.status === 'verified') {
        mappedState = SUBMISSION_STATES.VERIFIED;
      } else if (statusRes.status === 'rejected' || statusRes.status === 'failed') {
        mappedState = SUBMISSION_STATES.REJECTED;
      }

      dispatch({ type: 'SET_STATE', state: mappedState });

      if (statusRes.status === 'verified' || statusRes.status === 'rejected' || statusRes.status === 'failed') {
        // Fetch full result
        const finalSubmission = await getSubmissionById(submissionId);
        
        // Dispatch verified
        dispatch({
          type: 'SET_VERIFIED',
          state: mappedState,
          verificationResult: finalSubmission.verification_result,
          reward: rewardArg,
        });

        // Add earnings state if verified
        if (statusRes.status === 'verified') {
          setTimeout(() => {
            if (!isCancelled) {
              dispatch({
                type: 'SET_EARNINGS',
                state: SUBMISSION_STATES.EARNINGS_ADDED,
                reward: rewardArg,
                finalSubmission,
              });
              if (onComplete) onComplete(finalSubmission);
            }
          }, 1000);
        } else {
          if (onComplete) onComplete(finalSubmission);
        }
        return; // Stop polling
      }
    } catch (err) {
      console.error("Polling error:", err);
      // Wait and try again
    }

    // Schedule next poll
    if (!isCancelled) {
      timerId = setTimeout(poll, 2000);
    }
  }

  // Start polling
  poll();

  return () => {
    isCancelled = true;
    if (timerId) clearTimeout(timerId);
  };
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
