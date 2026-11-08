import React from 'react';
import { FolderGit2, Sparkles } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">My Projects Workspace</h1>
          <p className="text-sm text-slate-400 mt-1">
            Personal & Academic projects &bull; Tech stacks &bull; Milestones &bull; Portfolio Evidence
          </p>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto mb-4">
          <FolderGit2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-2">Projects & Practical Portfolio</h3>
        <p className="text-sm text-slate-400 mb-4">
          Scheduled for Phase 8. Will deliver personal and academic project workspaces linked to your 4 skill tracks and courses, milestone tasks, and portfolio links.
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Coming in Phase 8</span>
        </span>
      </div>
    </div>
  );
};

