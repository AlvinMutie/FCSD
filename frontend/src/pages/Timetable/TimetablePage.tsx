import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';

export const TimetablePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">My Timetable & Adaptive Schedule</h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic Python scheduling engine &bull; Reschedule My Day &bull; FullCalendar views
          </p>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-2">Adaptive Timetable Module</h3>
        <p className="text-sm text-slate-400 mb-4">
          Scheduled for Phase 5. Will deliver flexible availability management, FullCalendar Day/Week/Month views, conflict-free task scheduling, "Reschedule My Day", and overload detection.
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Coming in Phase 5</span>
        </span>
      </div>
    </div>
  );
};
