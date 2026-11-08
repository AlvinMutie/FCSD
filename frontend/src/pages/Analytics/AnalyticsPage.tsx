import React from 'react';
import { BarChart3, Sparkles } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Analytics & Life Balance Monitor</h1>
          <p className="text-sm text-slate-400 mt-1">
            Weekly reviews &bull; Time distribution vs goals &bull; Neglect prevention alerts
          </p>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-2">Life Balance Monitor & Weekly Review</h3>
        <p className="text-sm text-slate-400 mb-4">
          Scheduled for Phase 8. Will deliver real-time metrics comparing planned vs actual hours for academics, skills, and career, along with intelligent warnings when goals are neglected and structured Sunday weekly reviews.
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Coming in Phase 8</span>
        </span>
      </div>
    </div>
  );
};
