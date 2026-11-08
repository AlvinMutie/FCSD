import React from 'react';
import { GraduationCap, Sparkles } from 'lucide-react';

export const AcademicsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Academic Management & Distinction Planner</h1>
          <p className="text-sm text-slate-400 mt-1">
            JKUAT SODeL BSc IT &bull; Academic Balance Engine &bull; Assignments &bull; CATs &bull; Spaced Revision
          </p>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-2">Academic & Distinction Architecture</h3>
        <p className="text-sm text-slate-400 mb-4">
          Scheduled for Phase 2. Will deliver full CRUD for academic terms, units, assignments with subtasks, assessments, spaced revision planning, and the Attention Gap engine to ensure balanced coverage across all courses for distinction pacing.
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next: Phase 2 Milestone</span>
        </span>
      </div>
    </div>
  );
};
