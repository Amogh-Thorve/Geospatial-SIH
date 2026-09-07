/**
 * SubmitObservation.jsx
 * Multi-step observation submission page.
 *
 * Sections (visible simultaneously on one scrollable page):
 *   1. PageHeader (back button in actions)
 *   2. FlowProgress bar (currentStatus from reducer)
 *   3. STEP 1 — Photo (PhotoUpload)
 *   4. STEP 2 — Observation Type + Notes (SubmissionForm)
 *   5. STEP 3 — Location (LocationPicker)
 *   6. Submit button + validation summary
 *   7. "Submitted" holding card (shown after submit, before Phase 6 flow)
 *
 * State is managed by flowReducer from utils/submissionFlow.js.
 * Form validation runs on submit — not on every keypress.
 * All API calls go through jalSaheliApi.js.
 *
 * Props:
 *   onNavigateBack  — fn() called when user taps back (optional)
 */

import React, { useReducer, useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Camera,
  MapPin,
  ClipboardList,
  Send,
  CheckCircle,
  Loader,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import PageHeader           from '../../../components/common/PageHeader';
import FlowProgress         from '../components/FlowProgress';
import PhotoUpload          from '../components/PhotoUpload';
import SubmissionForm       from '../components/SubmissionForm';
import LocationPicker       from '../components/LocationPicker';
import TelegramSubmission   from '../components/TelegramSubmission';
import AIProcessing         from '../components/AIProcessing';
import SatelliteVerification from '../components/SatelliteVerification';
import VerificationResult   from '../components/VerificationResult';
import VerificationTimeline from '../components/VerificationTimeline';

import { submitObservation, getObservationTypes, recordSubmission, getProfile } from '../services/jalSaheliApi';
import {
  flowReducer,
  initialFlowState,
  SUBMISSION_STATES,
  FLOW_STEPS,
  runLiveAnalysisFlow,
} from '../utils/submissionFlow';
import { getAnalysis } from '../../../services/geoAiService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionLabel({ number, icon: Icon, title, done }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
      }`}>
        {done ? <CheckCircle className="w-3.5 h-3.5" /> : number}
      </div>
      {Icon && <Icon className={`w-4 h-4 shrink-0 ${done ? 'text-emerald-600' : 'text-slate-400'}`} />}
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SubmitObservation({ onNavigateBack }) {
  const [mode, setMode]   = useState('form'); // 'form' | 'telegram'
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);
  const [profile, setProfile] = useState(null);
  const [types, setTypes]   = useState([]);
  const [notes, setNotes]   = useState('');
  const [photoError, setPhotoError]       = useState(null);
  const [formErrors, setFormErrors]       = useState({});
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const submitCardRef = useRef(null);
  const cancelDemoRef = useRef(null);

  // Cancel any running timeouts on unmount
  useEffect(() => {
    return () => {
      if (cancelDemoRef.current) cancelDemoRef.current();
    };
  }, []);

  // Load profile and observation types
  useEffect(() => {
    getObservationTypes().then(setTypes).catch(console.error);
    getProfile().then(setProfile).catch(console.error);
  }, []);

  // Derived booleans
  const isLocked =
    isSubmitting ||
    (state.status !== SUBMISSION_STATES.IDLE &&
      state.status !== SUBMISSION_STATES.PHOTO_UPLOADED &&
      state.status !== SUBMISSION_STATES.LOCATION_SET);
  const isPostSubmit =
    state.status !== SUBMISSION_STATES.IDLE &&
    state.status !== SUBMISSION_STATES.PHOTO_UPLOADED &&
    state.status !== SUBMISSION_STATES.LOCATION_SET;
  const isVerifiedOutcome =
    state.status === SUBMISSION_STATES.VERIFIED ||
    state.status === SUBMISSION_STATES.EARNINGS_ADDED ||
    state.status === SUBMISSION_STATES.FAILED;
  const hasPhoto      = !!state.photo;
  const hasType       = !!state.observationType;
  const hasLocation   = !!state.location;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePhotoChange = useCallback((photoObj, err) => {
    setPhotoError(err || null);
    if (photoObj) {
      dispatch({ type: 'SET_PHOTO', photo: photoObj });
      // Clear photo validation error on success
      setFormErrors((prev) => ({ ...prev, photo: undefined }));
    }
  }, []);

  const handlePhotoRemove = useCallback(() => {
    dispatch({ type: 'CLEAR_PHOTO' });
    setPhotoError(null);
  }, []);

  const handleLocationSet = useCallback((loc) => {
    dispatch({ type: 'SET_LOCATION', location: loc });
    setFormErrors((prev) => ({ ...prev, location: undefined }));
  }, []);

  const handleTypeSelect = useCallback((typeObj) => {
    dispatch({ type: 'SET_OBSERVATION_TYPE', observationType: typeObj });
    setFormErrors((prev) => ({ ...prev, type: undefined }));
  }, []);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  function validate() {
    const errs = {};
    if (!hasPhoto)    errs.photo    = 'Please select a photo before submitting.';
    if (!hasType)     errs.type     = 'Please select an observation type.';
    if (!hasLocation) errs.location = 'Location is required. Please wait for it to load.';
    return errs;
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      // Scroll to first error
      const firstErrorEl = document.querySelector('[role="alert"]');
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const result = await submitObservation({
        observationType: state.observationType,
        location: state.location,
        photoFile: state.photo?.file ?? null,
        notes,
      });

      dispatch({
        type: 'SUBMIT',
        submissionId: result.submissionId,
      });

      // Launch centralized deterministic demo flow (7.2s pipeline)
      cancelDemoRef.current = runLiveAnalysisFlow(
        dispatch,
        {
          observationType: state.observationType,
          submissionId: result.submissionId,
          location: state.location,
          photo: state.photo,
          fetchAnalysis: () => getAnalysis(result.submissionId),
        },
        (finalSub) => {
          recordSubmission(finalSub);
        }
      );

      // Scroll submitted card into view
      setTimeout(() => submitCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      console.error('[SubmitObservation] submit error:', err);
      setFormErrors({ submit: 'Submission failed. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  function handleReset() {
    if (cancelDemoRef.current) cancelDemoRef.current();
    cancelDemoRef.current = null;
    dispatch({ type: 'RESET' });
    setNotes('');
    setPhotoError(null);
    setFormErrors({});
    setIsSubmitting(false);
  }

  // ---------------------------------------------------------------------------
  // Back button
  // ---------------------------------------------------------------------------

  const backButton = onNavigateBack ? (
    <button
      type="button"
      id="submit-obs-back-btn"
      onClick={onNavigateBack}
      className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold hover:text-slate-800 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
    </button>
  ) : null;

  // ---------------------------------------------------------------------------
  // Submitted holding card (Phase 5/6 will expand this)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Mode switcher bar
  // ---------------------------------------------------------------------------

  const modeSwitcher = (
    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-sm p-3 shadow-xs">
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded">
        <button
          type="button"
          id="mode-form-tab"
          onClick={() => setMode('form')}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
            mode === 'form'
              ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📋 Standard Web Form
        </button>
        <button
          type="button"
          id="mode-telegram-tab"
          onClick={() => setMode('telegram')}
          className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
            mode === 'telegram'
              ? 'bg-[#2AABEE] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-3 h-3" /> 🤖 Telegram Bot UI
        </button>
      </div>
      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
        {mode === 'telegram' ? 'Simulating WhatsApp/Telegram ground entry' : 'Full multi-step verification form'}
      </span>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Telegram mode
  // ---------------------------------------------------------------------------

  if (mode === 'telegram') {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Submit Observation"
          subtitle="Record a water feature • Telegram Cadre Bot Mode"
          actions={backButton}
        />
        {modeSwitcher}
        <TelegramSubmission profileName={profile?.name || 'Jal Saheli'} />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Submitted holding card (Phase 5/6 will expand this)
  // ---------------------------------------------------------------------------

  if (isPostSubmit) {
    return (
      <div className="space-y-5" ref={submitCardRef}>
        <PageHeader
          title={state.status === SUBMISSION_STATES.FAILED ? 'Geo AI unavailable' : isVerifiedOutcome ? 'Observation analyzed' : 'Processing Observation'}
          subtitle="Photo → unified backend → Geo AI lookup → verification if flagged"
          actions={backButton}
        />

        {modeSwitcher}

        <FlowProgress currentStatus={state.status} steps={FLOW_STEPS} language={state.language} />

        {isVerifiedOutcome ? (
          /* Final completed state: API-backed analysis summary */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <VerificationResult
                result={state.verificationResult}
                observationType={state.observationType}
                reward={state.reward > 0 ? state.reward : null}
                location={state.location}
                language={state.language}
                onLanguageChange={(l) => dispatch({ type: 'SET_LANGUAGE', language: l })}
                onReset={handleReset}
                onNavigateBack={onNavigateBack}
              />
            </div>
            <div>
              <VerificationTimeline
                status={state.status}
                submissionId={state.submissionId}
                reward={state.reward > 0 ? state.reward : null}
                location={state.location}
                analysis={state.verificationResult}
              />
            </div>
          </div>
        ) : (
          /* Live Processing State: AI + Satellite active */
          <div className="space-y-5">
            {/* Live banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    Verification Pipeline Active…
                  </h4>
                  <p className="text-[11px] text-amber-700">
                    Running unified backend Geo AI and local satellite grid lookup.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded">
                Ref: {state.submissionId}
              </span>
            </div>

            {/* Grid of AI, Satellite, and Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-4">
                <AIProcessing
                  status={state.status}
                  aiConfidence={state.verificationResult?.aiConfidence ?? null}
                  provider={state.verificationResult?.provider ?? null}
                  classification={
                    state.verificationResult?.lulc ||
                    state.verificationResult?.classification ||
                    null
                  }
                  observationType={state.observationType}
                  photo={state.photo}
                />
                <SatelliteVerification
                  status={state.status}
                  satelliteConfidence={state.verificationResult?.satelliteConfidence ?? null}
                  ndvi={state.verificationResult?.ndvi ?? null}
                  ndwi={state.verificationResult?.ndwi ?? null}
                  ndviSource={state.verificationResult?.ndviSource ?? null}
                  ndwiSource={state.verificationResult?.ndwiSource ?? null}
                  satelliteMatch={state.verificationResult?.satelliteMatch ?? null}
                  changeDetection={state.verificationResult?.changeDetection ?? null}
                  location={state.location}
                  observationType={state.observationType}
                />
              </div>
              <div>
                <VerificationTimeline
                  status={state.status}
                  submissionId={state.submissionId}
                  reward={state.observationType?.reward > 0 ? state.observationType.reward : null}
                  location={state.location}
                  analysis={state.verificationResult}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      <PageHeader
        title="Submit Observation"
        subtitle="Record a water feature • Photo → AI → Satellite → Verified → Earnings"
        actions={backButton}
      />

      {modeSwitcher}

      {/* Flow progress bar */}
      <FlowProgress currentStatus={state.status} steps={FLOW_STEPS} />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* ── STEP 1: Photo ─────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5">
          <SectionLabel number="1" icon={Camera} title="Upload Photo" done={hasPhoto} />
          <PhotoUpload
            photo={state.photo}
            onChange={handlePhotoChange}
            onRemove={handlePhotoRemove}
            disabled={isLocked}
            error={photoError || formErrors.photo}
          />
        </div>

        {/* ── STEP 2: Observation Type + Notes ──────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5">
          <SectionLabel number="2" icon={ClipboardList} title="Observation Details" done={hasType} />
          <SubmissionForm
            types={types}
            selectedType={state.observationType}
            onSelectType={handleTypeSelect}
            notes={notes}
            onNotesChange={setNotes}
            disabled={isLocked}
            errors={formErrors}
          />
        </div>

        {/* ── STEP 3: Location ──────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5">
          <SectionLabel number="3" icon={MapPin} title="Location" done={hasLocation} />
          <LocationPicker
            location={state.location}
            onLocationSet={handleLocationSet}
            disabled={isLocked}
            error={formErrors.location}
          />
        </div>

        {/* ── Submit area ───────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-5 space-y-4">

          {/* Global submit error */}
          {formErrors.submit && (
            <p className="flex items-start gap-2 text-sm text-rose-700 font-medium p-3 bg-rose-50 border border-rose-200 rounded" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {formErrors.submit}
            </p>
          )}

          {/* Readiness checklist */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            {[
              { done: hasPhoto,    label: 'Photo'    },
              { done: hasType,     label: 'Type'     },
              { done: hasLocation, label: 'Location' },
            ].map(({ done, label }) => (
              <div
                key={label}
                className={`py-2 rounded border font-semibold flex flex-col items-center gap-1 ${
                  done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {done
                  ? <CheckCircle className="w-3.5 h-3.5" />
                  : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                }
                {label}
              </div>
            ))}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            id="obs-submit-btn"
            disabled={isLocked}
            className={`w-full py-4 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              isLocked
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : hasPhoto && hasType && hasLocation
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99] shadow-sm'
                : 'bg-slate-200 text-slate-500 hover:bg-emerald-600 hover:text-white'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Observation
              </>
            )}
          </button>

          <p className="text-[10px] text-slate-400 text-center">
            Your observation will be verified by AI and satellite imagery before the reward is credited.
          </p>
        </div>

      </form>
    </div>
  );
}
