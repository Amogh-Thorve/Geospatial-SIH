/**
 * src/modules/jal-saheli/index.js
 * Public API surface for the Jal Saheli module.
 *
 * Person 1 imports from this single entry point — never from internal paths.
 *
 * Integration instructions for Person 1:
 * ----------------------------------------
 * import {
 *   JalSaheliDashboard,
 *   SubmitObservation,
 *   SubmissionHistory,
 *   VerificationHistory,
 *   Earnings,
 * } from './modules/jal-saheli';
 *
 * Then wire into App.jsx routes:
 *   <Route path="/jal-saheli"                element={<JalSaheliDashboard />} />
 *   <Route path="/jal-saheli/submit"         element={<SubmitObservation />} />
 *   <Route path="/jal-saheli/history"        element={<SubmissionHistory />} />
 *   <Route path="/jal-saheli/verifications"  element={<VerificationHistory />} />
 *   <Route path="/jal-saheli/earnings"       element={<Earnings />} />
 *
 * Or render <JalSaheliDashboard /> directly as the sole /jal-saheli route
 * if the dashboard handles its own internal tab routing.
 * ----------------------------------------
 */

// Pages — primary integration surface
export { default as JalSaheliDashboard }   from './pages/JalSaheliDashboard';
export { default as SubmitObservation }    from './pages/SubmitObservation';
export { default as SubmissionHistory }    from './pages/SubmissionHistory';
export { default as VerificationHistory }  from './pages/VerificationHistory';
export { default as Earnings }             from './pages/Earnings';

// Components — exported for optional deep integration
export { default as JalSaheliProfile }     from './components/JalSaheliProfile';
export { default as AccuracyScore }        from './components/AccuracyScore';
export { default as EarningsCard }         from './components/EarningsCard';
export { default as SubmissionCard }       from './components/SubmissionCard';
export { default as FlowProgress }         from './components/FlowProgress';
export { default as PhotoUpload }          from './components/PhotoUpload';
export { default as SubmissionForm }       from './components/SubmissionForm';
export { default as LocationPicker }       from './components/LocationPicker';
export { default as TelegramSubmission }   from './components/TelegramSubmission';
export { default as AIProcessing }         from './components/AIProcessing';
export { default as SatelliteVerification } from './components/SatelliteVerification';
export { default as VerificationResult }   from './components/VerificationResult';
export { default as LocalLanguageResult }  from './components/LocalLanguageResult';
export { default as VerificationTimeline } from './components/VerificationTimeline';

// Service layer — exported so future integration tests can mock them
export * as jalSaheliApi from './services/jalSaheliApi';

// State machine utilities — exported for testing
export {
  SUBMISSION_STATES,
  FLOW_STEPS,
  pollVerificationStatus,
  flowReducer,
  initialFlowState,
  generateSubmissionId,
} from './utils/submissionFlow';

// Local language definitions
export { LOCALIZED_CONTENT } from './utils/localLanguageContent';

