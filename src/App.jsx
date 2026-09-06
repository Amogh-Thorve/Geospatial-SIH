import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';

import CommandCenter from './pages/CommandCenter';
import GisMap from './pages/GisMap';
import SubmissionAnalysis from './pages/SubmissionAnalysis';
import VerificationQueue from './pages/VerificationQueue';
import Analytics from './pages/Analytics';
import JalSaheli from './pages/JalSaheli';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
        {/* Persistent Dark Navy Sidebar */}
        <Sidebar />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Persistent Topbar */}
          <Topbar />

          {/* Dynamic Route Content Canvas */}
          <main className="flex-1 overflow-y-auto p-6 bg-slate-100">
            <Routes>
              <Route path="/" element={<CommandCenter />} />
              <Route path="/map" element={<GisMap />} />
              <Route path="/submissions" element={<SubmissionAnalysis />} />
              <Route path="/verification" element={<VerificationQueue />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/jal-saheli" element={<JalSaheli />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
