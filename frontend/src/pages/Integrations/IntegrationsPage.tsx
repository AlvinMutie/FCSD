import React from 'react';
import { Puzzle, Sparkles, ShieldCheck } from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Integrations & MyLife Bridge</h1>
          <p className="text-sm text-slate-400 mt-1">
            JKUAT SODeL assisted sync &bull; Chrome Extension MV3 &bull; Pending Imports Review
          </p>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-4">
          <Puzzle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-2">MyLife Bridge & Pending Imports</h3>
        <p className="text-sm text-slate-400 mb-4">
          Scheduled for Phases 3 & 4. Delivers the read-only Chrome Manifest V3 extension, secure local pairing token, guided synchronization for JKUAT SODeL courses, and human-in-the-loop review manager.
        </p>
        <div className="flex items-center justify-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-300">Zero LMS passwords or cookies stored</span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Coming in Phases 3 & 4</span>
        </span>
      </div>
    </div>
  );
};

