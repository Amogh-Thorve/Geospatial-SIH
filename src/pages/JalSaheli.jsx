import React from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { MOCK_JAL_SAHELI_PROFILE } from '../data/mockData';
import {
  Award,
  CheckCircle,
  IndianRupee,
  Send,
  Camera,
  Brain,
  Satellite,
  ShieldCheck,
  TrendingUp,
  User,
  Phone,
  MapPin,
  HelpCircle
} from 'lucide-react';

export default function JalSaheli() {
  const profile = MOCK_JAL_SAHELI_PROFILE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Jal Saheli — Community Water Cadre Hub"
        subtitle="Empowering women water champions with decentralized geotag verification & incentive tracking"
      />

      {/* Profile Header & Stats */}
      <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-amber-600 text-white rounded flex items-center justify-center font-bold text-xl shadow-sm border border-amber-700">
              AP
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
                <StatusBadge status="verified" text={profile.badge} />
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">{profile.role}</p>
              <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                <span className="flex items-center"><MapPin className="w-3 h-3 text-slate-400 mr-1" />{profile.village}</span>
                <span className="flex items-center"><Phone className="w-3 h-3 text-slate-400 mr-1" />{profile.phone}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded border border-slate-200">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Demo Incentive Balance</span>
              <span className="text-xl font-bold text-emerald-700">{profile.demoEarnings}</span>
              <span className="text-[9px] text-slate-400 block font-semibold">(Mock / Demo Data Only)</span>
            </div>
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 4 Cadre Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
            <span className="text-[11px] text-slate-500 font-medium uppercase block">Total Submissions</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">{profile.submissions}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
            <span className="text-[11px] text-slate-500 font-medium uppercase block">Verified Interventions</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block">{profile.verified}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
            <span className="text-[11px] text-slate-500 font-medium uppercase block">Accuracy Rate</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block">{profile.accuracy}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm">
            <span className="text-[11px] text-slate-500 font-medium uppercase block">Member Since</span>
            <span className="text-xs font-bold text-slate-800 mt-2 block">{profile.memberSince}</span>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Flow: Photo → AI → Satellite → Verified → Credibility → Earnings */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Jal Saheli Verification & Incentive Lifecycle Flow
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex flex-col items-center justify-center space-y-1">
            <Camera className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-slate-800">1. Photo</span>
            <span className="text-[10px] text-slate-500">Geotagged upload</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex flex-col items-center justify-center space-y-1">
            <Brain className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-slate-800">2. AI Vision</span>
            <span className="text-[10px] text-slate-500">Feature classification</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex flex-col items-center justify-center space-y-1">
            <Satellite className="w-5 h-5 text-sky-600" />
            <span className="font-bold text-slate-800">3. Satellite</span>
            <span className="text-[10px] text-slate-500">Sentinel-2 audit</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex flex-col items-center justify-center space-y-1">
            <CheckCircle className="w-5 h-5 text-emerald-700" />
            <span className="font-bold text-slate-800">4. Verified</span>
            <span className="text-[10px] text-slate-500">Officer triage</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex flex-col items-center justify-center space-y-1">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-slate-800">5. Credibility</span>
            <span className="text-[10px] text-slate-500">Score boost</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex flex-col items-center justify-center space-y-1">
            <IndianRupee className="w-5 h-5 text-emerald-700" />
            <span className="font-bold text-slate-800">6. Earnings</span>
            <span className="text-[10px] text-slate-500">Direct incentive</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Telegram Bot Mock Card (Left) + Submissions Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mock Telegram Bot Card */}
        <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Send className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Telegram Bot Interface Mock
            </h3>
          </div>
          
          <p className="text-xs text-slate-500">
            Simulated view of Jal Saheli ground entry via lightweight Telegram bot integration:
          </p>

          <div className="bg-slate-900 text-slate-100 p-3.5 rounded text-xs space-y-3 font-mono">
            <div className="bg-slate-800 p-2.5 rounded border border-slate-700">
              <span className="text-slate-400 text-[10px] block font-sans">Asha Patil ({profile.telegramDemoStep.botName}):</span>
              <p className="text-slate-200 mt-1">{profile.telegramDemoStep.userMessage}</p>
            </div>

            <div className="bg-emerald-950/80 border border-emerald-800 p-2.5 rounded text-emerald-300">
              <span className="text-emerald-400 text-[10px] block font-sans">GeoWise Automated Bot Reply:</span>
              <p className="whitespace-pre-line mt-1">{profile.telegramDemoStep.botReply}</p>
            </div>
          </div>
        </div>

        {/* Recent Submissions List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Asha Patil's Recent Submissions Log
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {profile.recentSubmissions.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-1 rounded">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{item.id}</span>
                    <span className="text-slate-700 font-semibold">• {item.type}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{item.date}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <StatusBadge status={item.status} text={item.status} />
                  <span className="font-bold text-emerald-700 text-xs">{item.earnings}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
