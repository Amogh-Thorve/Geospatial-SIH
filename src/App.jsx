import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import { ApiStatusProvider } from './context/ApiStatusContext';

import CommandCenter from './pages/CommandCenter';
import SubmissionAnalysis from './pages/SubmissionAnalysis';
import VerificationQueue from './pages/VerificationQueue';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { GISMapPage } from './modules/gis-map';
import { JalSaheliDashboard } from './modules/jal-saheli';


export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <ApiStatusProvider>
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
        {/* Mobile sidebar backdrop overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Persistent Sidebar — always visible on lg+, drawer on mobile */}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Persistent Topbar */}
          <Topbar onMenuToggle={openSidebar} />

          {/* Dynamic Route Content Canvas */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
            <Routes>
              <Route path="/" element={<CommandCenter />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/gis-map" element={<GISMapPage />} />
              <Route path="/jal-saheli" element={<JalSaheliDashboard />} />
              <Route path="/submission-analysis" element={<SubmissionAnalysis />} />
              <Route path="/verification" element={<VerificationQueue />} />
              <Route path="/settings" element={<Settings />} />
              {/* Catch-all for unknown routes */}
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                  <p className="text-4xl font-bold text-slate-300 mb-3">404</p>
                  <h1 className="text-lg font-bold text-slate-800">Page Not Found</h1>
                  <p className="text-xs text-slate-500 mt-1 mb-5 max-w-xs">The route you requested does not exist. Use the sidebar to navigate.</p>
                  <Link to="/" className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors">Return to Command Center</Link>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
    </ApiStatusProvider>
  );
}
