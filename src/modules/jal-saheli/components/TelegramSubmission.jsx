/**
 * TelegramSubmission.jsx
 * A convincing Telegram-like bot conversation UI for submitting water observations.
 *
 * Architecture notes:
 * ─────────────────────────────────────────────────────────────────────────────
 * • This is a FRONTEND cadre interface — no real Telegram API, SDK, or bot tokens.
 * • All state is managed by flowReducer from utils/submissionFlow.js.
 * • Data flows exclusively through jalSaheliApi.js.
 * • Future real Telegram bot lives under: backend/jal_saheli/telegram_bot/
 *
 * Props:
 *   profileName     — string (displayed in greeting, defaults to "Jal Saheli")
 *   onSubmitSuccess — fn({ submissionId, status })
 *   onReset         — fn()
 */

import React, { useReducer, useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle,
  Loader,
  Brain,
  Satellite,
  IndianRupee,
  RefreshCw,
  AlertCircle,
  Navigation,
} from 'lucide-react';

import { submitObservation, getObservationTypes, recordSubmission } from '../services/jalSaheliApi';
import { getAnalysis } from '../../../services/geoAiService';
import {
  flowReducer,
  initialFlowState,
  SUBMISSION_STATES,
  runLiveAnalysisFlow,
} from '../utils/submissionFlow';
import { LOCALIZED_CONTENT } from '../utils/localLanguageContent';

// ─────────────────────────────────────────────────────────────────────────────
// Telegram colour constants
// ─────────────────────────────────────────────────────────────────────────────
const BOT_BUBBLE  = 'bg-white text-slate-800 border border-slate-200 shadow-xs';
const USER_BUBBLE = 'bg-[#2AABEE] text-white shadow-xs';
const BOT_NAME    = 'Jal Saheli Bot';
const BOT_AVATAR  = '🤖';

// Offline fallback — ONLY used if user explicitly taps fallback
const OFFLINE_FALLBACK = {
  lat: 18.0667, lng: 73.9167,
  label: 'Khed, Pune (Offline Fallback)',
  district: 'Pune District', state: 'Maharashtra',
  source: 'fallback',
};

// ─────────────────────────────────────────────────────────────────────────────
// Conversation step constants
// ─────────────────────────────────────────────────────────────────────────────
const CONV_STEP = {
  GREETING:     'greeting',
  PHOTO_WAIT:   'photo_wait',
  TYPE_WAIT:    'type_wait',
  LOCATION_WAIT:'location_wait',
  LOCATION_FAILED:'location_failed',
  SUBMITTING:   'submitting',
  PROCESSING:   'processing',
  DONE:         'done',
  ERROR:        'error',
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function BotHeader() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#2AABEE] text-white rounded-t-xl shadow-xs">
      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg select-none">
        {BOT_AVATAR}
      </div>
      <div>
        <p className="text-sm font-bold leading-tight">{BOT_NAME}</p>
        <p className="text-[11px] text-white/80 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />
          Field Cadre Channel · Ground Entry
        </p>
      </div>
    </div>
  );
}

function Bubble({ side = 'bot', children, timestamp = null }) {
  const isBot = side === 'bot';
  return (
    <div className={`flex items-end gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-[#2AABEE]/10 border border-[#2AABEE]/20 flex items-center justify-center text-xs shrink-0 mb-0.5 select-none">
          {BOT_AVATAR}
        </div>
      )}
      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
        isBot ? `${BOT_BUBBLE} rounded-tl-xs` : `${USER_BUBBLE} rounded-tr-xs`
      }`}>
        {children}
        {timestamp && (
          <p className={`text-[10px] mt-1 text-right ${isBot ? 'text-slate-400' : 'text-white/60'}`}>
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-7 h-7 rounded-full bg-[#2AABEE]/10 border border-[#2AABEE]/20 flex items-center justify-center text-xs shrink-0 mb-0.5 select-none">
        {BOT_AVATAR}
      </div>
      <div className={`px-4 py-3 rounded-2xl rounded-tl-xs ${BOT_BUBBLE}`}>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PhotoBubble({ photo }) {
  return (
    <div className="flex justify-end">
      <div className="overflow-hidden rounded-2xl rounded-tr-xs shadow-xs max-w-[60%] border-2 border-[#2AABEE]">
        {photo?.previewUrl ? (
          <img src={photo.previewUrl} alt="Observation" className="w-full h-32 object-cover" />
        ) : (
          <div className="w-32 h-32 bg-[#2AABEE]/10 flex items-center justify-center">
            <Camera className="w-8 h-8 text-[#2AABEE]" />
          </div>
        )}
        <div className="bg-[#2AABEE] px-3 py-1.5">
          <p className="text-[11px] text-white font-medium truncate">{photo?.name || 'photo.jpg'}</p>
          <p className="text-[10px] text-white/70 flex items-center gap-1">
            <CheckCircle className="w-2.5 h-2.5" /> Sent
          </p>
        </div>
      </div>
    </div>
  );
}

function TypeChips({ types, onSelect, disabled }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {types.map(t => (
        <button
          key={t.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(t)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-[#2AABEE]/10 border-[#2AABEE]/30 text-[#1a8ac4] hover:bg-[#2AABEE]/20 active:scale-95'
          }`}
        >
          <span>{t.emoji}</span> {t.label}
        </button>
      ))}
    </div>
  );
}

function ProcessingRow({ icon: Icon, label, status, color }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${color} ${status === 'running' ? 'animate-spin' : ''}`} />
      <span className={`font-medium ${status === 'done' ? 'text-emerald-700' : status === 'running' ? 'text-amber-600' : 'text-slate-400'}`}>
        {label}
      </span>
      {status === 'done'  && <CheckCircle className="w-3 h-3 text-emerald-600 ml-auto shrink-0" />}
      {status === 'running' && <Loader className="w-3 h-3 text-amber-500 animate-spin ml-auto shrink-0" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function TelegramSubmission({
  profileName = 'Jal Saheli',
  onSubmitSuccess,
  onReset,
}) {
  const [flowState, dispatch] = useReducer(flowReducer, initialFlowState);
  const [convStep, setConvStep] = useState(CONV_STEP.GREETING);
  const [types, setTypes] = useState([]);
  const [photoError, setPhotoError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showTyping, setShowTyping] = useState(false);
  const [now] = useState(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
  const [botLang, setBotLang] = useState('en');

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const cancelDemoRef = useRef(null);

  useEffect(() => {
    getObservationTypes().then(setTypes).catch(console.error);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  useEffect(() => {
    return () => { if (cancelDemoRef.current) cancelDemoRef.current(); };
  }, []);

  const botPause = useCallback((ms = 600) => new Promise(r => setTimeout(r, ms)), []);

  function showTypingThen(ms, fn) {
    setShowTyping(true);
    setTimeout(() => { setShowTyping(false); fn(); }, ms);
  }

  // ── Photo handling ─────────────────────────────────────────────────────────
  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file (JPG, PNG, HEIC).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('File too large. Max 10 MB.');
      return;
    }

    setPhotoError(null);
    const previewUrl = URL.createObjectURL(file);
    const photoObj = { file, previewUrl, name: file.name };
    dispatch({ type: 'SET_PHOTO', photo: photoObj });

    setConvStep(CONV_STEP.TYPE_WAIT);
  }

  // ── Type selection ─────────────────────────────────────────────────────────
  function handleTypeSelect(typeObj) {
    dispatch({ type: 'SET_OBSERVATION_TYPE', observationType: typeObj });
    showTypingThen(700, () => setConvStep(CONV_STEP.LOCATION_WAIT));
  }

  // ── Location sharing ───────────────────────────────────────────────────────
  function handleShareLocation() {
    setLocationLoading(true);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationLoading(false);
      setConvStep(CONV_STEP.LOCATION_FAILED);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`,
          district: 'GPS Geotag',
          state: '',
          source: 'gps',
        };
        setLocationLoading(false);
        dispatch({ type: 'SET_LOCATION', location: loc });
        showTypingThen(600, () => setConvStep(CONV_STEP.SUBMITTING));
      },
      () => {
        setLocationLoading(false);
        setConvStep(CONV_STEP.LOCATION_FAILED);
      },
      { timeout: 8000, maximumAge: 30000, enableHighAccuracy: true }
    );
  }

  function handleUseFallbackLocation() {
    dispatch({ type: 'SET_LOCATION', location: OFFLINE_FALLBACK });
    showTypingThen(500, () => setConvStep(CONV_STEP.SUBMITTING));
  }

  // ── Submit logic ───────────────────────────────────────────────────────────
  const submitRef = useRef(false);
  useEffect(() => {
    if (convStep !== CONV_STEP.SUBMITTING || submitRef.current) return;
    submitRef.current = true;

    const doSubmit = async () => {
      try {
        const result = await submitObservation({
          observationType: flowState.observationType,
          location: flowState.location,
          photoFile: flowState.photo?.file ?? null,
        });

        dispatch({ type: 'SUBMIT', submissionId: result.submissionId });
        if (onSubmitSuccess) onSubmitSuccess({ submissionId: result.submissionId, status: 'submitted' });

        await botPause(500);
        setConvStep(CONV_STEP.PROCESSING);

        // Run the 7.2s verification flow
        cancelDemoRef.current = runLiveAnalysisFlow(
          dispatch,
          {
            observationType: flowState.observationType || { id: 'water_body', label: 'Water Body' },
            submissionId: result.submissionId,
            location: flowState.location,
            photo: flowState.photo,
            fetchAnalysis: () => getAnalysis(result.submissionId),
          },
          (finalSub) => {
            finalSub.channel = 'telegram';
            recordSubmission(finalSub);
          }
        );

      } catch {
        setApiError('Could not submit observation. Please check your connection.');
        setConvStep(CONV_STEP.ERROR);
      }
    };

    doSubmit();
  }, [convStep, flowState.location, flowState.observationType, flowState.photo, onSubmitSuccess, botPause]);



  // ── Reset ──────────────────────────────────────────────────────────────────
  function handleReset() {
    if (cancelDemoRef.current) cancelDemoRef.current();
    cancelDemoRef.current = null;
    submitRef.current = false;
    dispatch({ type: 'RESET' });
    setConvStep(CONV_STEP.GREETING);
    setPhotoError(null);
    setApiError(null);
    setShowTyping(false);
    setLocationLoading(false);
    if (onReset) onReset();
  }

  const isTypeLocked = convStep !== CONV_STEP.TYPE_WAIT;
  const isLocationLocked = convStep !== CONV_STEP.LOCATION_WAIT;
  const isProcessing = convStep === CONV_STEP.PROCESSING || convStep === CONV_STEP.SUBMITTING;
  const isDone =
    convStep === CONV_STEP.DONE ||
    flowState.status === SUBMISSION_STATES.VERIFIED ||
    flowState.status === SUBMISSION_STATES.EARNINGS_ADDED;

  const pipeline = {
    ai: flowState.status === SUBMISSION_STATES.AI_PROCESSING
      ? 'running'
      : [
          SUBMISSION_STATES.AI_COMPLETE,
          SUBMISSION_STATES.SATELLITE_PROCESSING,
          SUBMISSION_STATES.SATELLITE_COMPLETE,
          SUBMISSION_STATES.FINAL_VERIFICATION,
          SUBMISSION_STATES.VERIFIED,
          SUBMISSION_STATES.EARNINGS_ADDED,
        ].includes(flowState.status)
      ? 'done'
      : 'pending',
    satellite: flowState.status === SUBMISSION_STATES.SATELLITE_PROCESSING
      ? 'running'
      : [
          SUBMISSION_STATES.SATELLITE_COMPLETE,
          SUBMISSION_STATES.FINAL_VERIFICATION,
          SUBMISSION_STATES.VERIFIED,
          SUBMISSION_STATES.EARNINGS_ADDED,
        ].includes(flowState.status)
      ? 'done'
      : 'pending',
    verified: [SUBMISSION_STATES.VERIFIED, SUBMISSION_STATES.EARNINGS_ADDED].includes(flowState.status)
      ? 'done'
      : 'pending',
  };
  const hasPhoto = !!flowState.photo;
  const hasType = !!flowState.observationType;
  const hasLocation = !!flowState.location;

  const submittedId = flowState.submissionId;
  const reward = 0;
  const typeLabel = flowState.observationType?.label ?? 'Water Body';
  const locLabel = flowState.location?.label || 'Field Coordinates';

  return (
    <div className="flex flex-col bg-[#EEF2F7] rounded-xl shadow-lg overflow-hidden border border-slate-200"
         style={{ minHeight: '520px', maxHeight: '80vh' }}>

      <BotHeader />

      {/* Chat conversation area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3"
           style={{ background: 'linear-gradient(180deg, #EEF2F7 0%, #E8EEF7 100%)' }}>

        {/* Bot greeting */}
        <Bubble side="bot" timestamp={now}>
          <p>Namaste <strong>{profileName}</strong> 👋</p>
          <p className="mt-1 text-[13px] text-slate-600">
            I'm the <strong>Jal Saheli Bot</strong> — your water monitoring field assistant.
          </p>
        </Bubble>

        <Bubble side="bot">
          <p className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#2AABEE] shrink-0" />
            Please send your <strong>observation photo</strong>.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Tap the camera button below ↓</p>
        </Bubble>

        {/* User photo */}
        {hasPhoto && (
          <>
            <PhotoBubble photo={flowState.photo} />
            <Bubble side="bot">
              <p className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Photo received ✓
              </p>
            </Bubble>
            <Bubble side="bot">
              <p className="font-medium mb-1">Please select the <strong>observation type</strong>:</p>
              <TypeChips
                types={types}
                onSelect={handleTypeSelect}
                disabled={isTypeLocked}
              />
            </Bubble>
          </>
        )}

        {/* User type selection */}
        {hasType && (
          <>
            <Bubble side="user">
              <p className="flex items-center gap-1.5">
                <span>{flowState.observationType.emoji}</span>
                <strong>{typeLabel}</strong>
              </p>
            </Bubble>

            <Bubble side="bot">
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2AABEE] shrink-0" />
                Got it! Please <strong>share your location</strong>.
              </p>
              <button
                type="button"
                disabled={isLocationLocked || locationLoading}
                onClick={handleShareLocation}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all mt-2 ${
                  isLocationLocked || locationLoading
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#2AABEE]/10 border-[#2AABEE]/30 text-[#1a8ac4] hover:bg-[#2AABEE]/20 active:scale-95'
                }`}
              >
                {locationLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                {locationLoading ? 'Acquiring GPS…' : 'Share GPS location'}
              </button>
            </Bubble>
          </>
        )}

        {/* Location unavailable state */}
        {convStep === CONV_STEP.LOCATION_FAILED && !hasLocation && (
          <Bubble side="bot">
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-amber-700 font-semibold text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                Location unavailable (GPS permission denied or timed out)
              </p>
              <p className="text-[11px] text-slate-500">
                You can retry acquiring your GPS coordinates or proceed with offline fallback coordinates.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleShareLocation}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Retry GPS
                </button>
                <button
                  type="button"
                  onClick={handleUseFallbackLocation}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-full text-xs font-medium hover:bg-amber-50 transition-colors"
                >
                  Use offline fallback coordinates
                </button>
              </div>
            </div>
          </Bubble>
        )}

        {/* User location shared */}
        {hasLocation && (
          <Bubble side="user">
            <p className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-white/80" />
              <span className="font-medium">{locLabel}</span>
            </p>
            {flowState.location?.lat != null && (
              <p className="text-[11px] text-white/70 mt-0.5 font-mono">
                {flowState.location.lat.toFixed(4)}°N &nbsp;
                {flowState.location.lng.toFixed(4)}°E
              </p>
            )}
          </Bubble>
        )}

        {/* Submitting state */}
        {convStep === CONV_STEP.SUBMITTING && (
          <Bubble side="bot">
            <p className="flex items-center gap-2 text-amber-600 font-semibold text-xs">
              <Loader className="w-3.5 h-3.5 animate-spin" />
              Submitting your observation…
            </p>
          </Bubble>
        )}

        {/* Submitted confirmation */}
        {submittedId && (
          <Bubble side="bot">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                <CheckCircle className="w-3.5 h-3.5" />
                Observation submitted successfully ✓
              </p>
              <p className="text-[11px] text-slate-500">
                Reference ID: <span className="font-bold text-slate-700 font-mono">{submittedId}</span>
              </p>
            </div>
          </Bubble>
        )}

        {/* Processing pipeline */}
        {(convStep === CONV_STEP.PROCESSING || convStep === CONV_STEP.DONE) && (
          <Bubble side="bot">
            <p className="font-semibold text-slate-700 mb-2 text-[13px]">
              🔍 Your observation is being analyzed…
            </p>
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <ProcessingRow
                icon={Brain}
                label="GeoBrain-v3 AI Classification"
                status={pipeline.ai}
                color="text-violet-500"
              />
              <ProcessingRow
                icon={Satellite}
                label="Sentinel-2 Satellite Audit"
                status={pipeline.satellite}
                color="text-sky-500"
              />
              <ProcessingRow
                icon={CheckCircle}
                label="Final Verification"
                status={pipeline.verified}
                color="text-emerald-600"
              />
            </div>
          </Bubble>
        )}

        {/* Verification complete card */}
        {isDone && (
          <>
            <Bubble side="bot">
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">
                      {flowState.verificationResult?.available === false ? 'Geo AI unavailable' : 'Analysis stored'}
                    </p>
                    <p className="text-[11px] text-emerald-600">
                      LULC: {flowState.verificationResult?.classification || '—'}
                      {flowState.verificationResult?.aiConfidence != null
                        ? ` · Confidence: ${flowState.verificationResult.aiConfidence}%`
                        : ' · Confidence not produced'}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                  <p className="font-semibold text-slate-700">{flowState.verificationResult?.satelliteMatch || 'No satellite match'}</p>
                  <p>NDVI: {flowState.verificationResult?.ndvi ?? '—'}</p>
                  <p>NDWI: {flowState.verificationResult?.ndwi ?? '—'}</p>
                  <p>{flowState.verificationResult?.changeDetection || flowState.verificationResult?.message || ''}</p>
                </div>
              </div>
            </Bubble>

            {/* Reward bubble */}
            <Bubble side="bot">
              <div className="flex items-center gap-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Incentive Credited</p>
                  <p className="text-lg font-bold text-emerald-800">₹{reward}</p>
                  <p className="text-[10px] text-slate-400">Direct Cadre Disbursement via Jan Dhan / UPI</p>
                </div>
              </div>
            </Bubble>

            {/* Multilingual switchable verdict */}
            <Bubble side="bot">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    🌐 भाषा / Language
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-[10px]">
                    {[
                      { id: 'en', label: 'English' },
                      { id: 'mr', label: 'मराठी' },
                      { id: 'hi', label: 'हिंदी' },
                    ].map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setBotLang(l.id)}
                        className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                          botLang === l.id
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-emerald-800">
                    {LOCALIZED_CONTENT[botLang].title}
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    {LOCALIZED_CONTENT[botLang].detection}
                  </p>
                  <p className="text-[11px] text-violet-700 font-medium">
                    {LOCALIZED_CONTENT[botLang].aiLabel(flowState.verificationResult?.aiConfidence ?? 'n/a')}
                  </p>
                  <p className="text-[11px] text-sky-700 font-medium">
                    {LOCALIZED_CONTENT[botLang].satelliteLabel(flowState.verificationResult?.satelliteMatch || 'n/a')}
                  </p>
                  <p className="text-xs font-bold text-emerald-700 pt-1">
                    {LOCALIZED_CONTENT[botLang].rewardText(reward)}
                  </p>
                </div>
              </div>
            </Bubble>
          </>
        )}

        {/* Error message */}
        {convStep === CONV_STEP.ERROR && (
          <Bubble side="bot">
            <p className="flex items-start gap-2 text-rose-600 font-medium text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {apiError || 'Something went wrong. Please try again.'}
            </p>
          </Bubble>
        )}

        {showTyping && <TypingIndicator />}
      </div>

      {/* Bottom input area */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        {isDone || convStep === CONV_STEP.ERROR ? (
          <button
            type="button"
            onClick={handleReset}
            id="telegram-new-submission-btn"
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2AABEE] text-white text-sm font-bold rounded-xl hover:bg-[#1a8ac4] active:scale-[0.99] transition-all shadow-xs"
          >
            <RefreshCw className="w-4 h-4" /> New Observation
          </button>
        ) : isProcessing ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-1">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-xs">Processing observation through AI and satellite audit…</span>
          </div>
        ) : !hasPhoto ? (
          <div className="space-y-1">
            {photoError && (
              <p className="text-xs text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {photoError}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="telegram-photo-btn"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#2AABEE] text-white text-sm font-bold rounded-xl hover:bg-[#1a8ac4] active:scale-[0.99] transition-all shadow-xs"
                aria-label="Select or take a photo"
              >
                <Camera className="w-4 h-4" /> 📷 Send Field Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileInput}
                aria-hidden="true"
              />
            </div>
          </div>
        ) : !hasType ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
            <span className="text-base">👆</span> Select an observation type above
          </div>
        ) : !hasLocation ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
            <Navigation className="w-3.5 h-3.5" /> Tap "Share GPS location" above
          </div>
        ) : null}
      </div>
    </div>
  );
}
