import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Plus, ChevronRight, Star, ExternalLink, Trash2,
  FileText, Calendar, AlertCircle, CheckCircle2, Zap, X,
  TrendingUp, Users, Award,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  JobOpportunityItem,
  CVDocumentItem,
  InterviewPrepItem,
  PipelineStage,
  SkillsGapAnalysis,
} from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES: PipelineStage[] = [
  'Saved', 'Preparing', 'Applied', 'Interview', 'Offer', 'Rejected',
];

const STAGE_COLORS: Record<PipelineStage, string> = {
  Saved:     'bg-slate-700 text-slate-200',
  Preparing: 'bg-blue-500/20 text-blue-300',
  Applied:   'bg-amber-500/20 text-amber-300',
  Interview: 'bg-purple-500/20 text-purple-300',
  Offer:     'bg-emerald-500/20 text-emerald-300',
  Rejected:  'bg-red-500/20 text-red-400',
  Withdrawn: 'bg-slate-600/40 text-slate-400',
};

const STAGE_DOT: Record<PipelineStage, string> = {
  Saved:     'bg-slate-400',
  Preparing: 'bg-blue-400',
  Applied:   'bg-amber-400',
  Interview: 'bg-purple-400',
  Offer:     'bg-emerald-400',
  Rejected:  'bg-red-400',
  Withdrawn: 'bg-slate-500',
};

const JOB_TYPES = ['Internship', 'Attachment', 'Entry-level', 'Junior Developer', 'IT Support', 'Networking', 'Cybersecurity', 'Other'];
const CV_CATEGORIES = ['General IT', 'IT Support', 'Networking', 'Junior Developer', 'Cybersecurity'];
const INTERVIEW_TYPES = ['Technical', 'HR', 'Assessment', 'Panel'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PriorityStars: React.FC<{ priority: number }> = ({ priority }) => (
  <span className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <Star key={n} className={`w-3 h-3 ${n <= priority ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
    ))}
  </span>
);

const StageBadge: React.FC<{ stage: PipelineStage }> = ({ stage }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${STAGE_DOT[stage]}`} />
    {stage}
  </span>
);

const ReadinessBadge: React.FC<{ indicator: string }> = ({ indicator }) => {
  const map: Record<string, string> = {
    'High Match':            'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
    'Moderate Match':        'text-amber-300 bg-amber-500/15 border-amber-500/30',
    'Prerequisites Needed':  'text-red-300 bg-red-500/15 border-red-500/30',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${map[indicator] || ''}`}>
      {indicator}
    </span>
  );
};

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return 'Closed';
  if (diff === 0) return 'Closes today';
  return `${diff}d left`;
}

// ─── Add Opportunity Modal ────────────────────────────────────────────────────

interface AddOppModalProps {
  onClose: () => void;
  onSaved: (opp: JobOpportunityItem) => void;
}

const AddOppModal: React.FC<AddOppModalProps> = ({ onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: '', company: '', location: 'Nairobi / Remote',
    job_type: 'Internship', description: '', requirements: '',
    application_url: '', closing_date: '', priority: 3, notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.company.trim()) {
      setErr('Job title and company are required.');
      return;
    }
    setSaving(true); setErr('');
    try {
      const res = await api.createOpportunity({
        ...form,
        closing_date:    form.closing_date    || undefined,
        description:     form.description     || undefined,
        requirements:    form.requirements    || undefined,
        application_url: form.application_url || undefined,
        notes:           form.notes           || undefined,
      });
      onSaved(res.opportunity);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error saving opportunity');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">Add Job Opportunity</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          {err && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{err}</p>}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Job Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Junior Python Developer" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Company *</label>
              <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Job Type</label>
              <select value={form.job_type} onChange={e => set('job_type', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500">
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Priority (1–5)</label>
              <input type="number" min={1} max={5} value={form.priority} onChange={e => set('priority', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Application URL</label>
            <input value={form.application_url} onChange={e => set('application_url', e.target.value)} placeholder="https://..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Closing Date</label>
            <input type="date" value={form.closing_date} onChange={e => set('closing_date', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Requirements / Skills Needed</label>
            <textarea value={form.requirements} onChange={e => set('requirements', e.target.value)} rows={3} placeholder="Python, Flask, SQL, Git..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors">
            {saving ? 'Saving…' : 'Save Opportunity'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Add CV Modal ─────────────────────────────────────────────────────────────

interface AddCVModalProps {
  onClose: () => void;
  onSaved: (cv: CVDocumentItem) => void;
}

const AddCVModal: React.FC<AddCVModalProps> = ({ onClose, onSaved }) => {
  const [form, setForm] = useState({ title: '', category: 'General IT', file_path: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await api.addCV({ ...form, file_path: form.file_path || undefined, notes: form.notes || undefined });
      onSaved(res.cv_document);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error saving CV');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">Add CV Document</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {err && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{err}</p>}
          <div>
            <label className="block text-xs text-slate-400 mb-1">CV Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Junior Developer CV v2" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500">
              {CV_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">File Path (optional)</label>
            <input value={form.file_path} onChange={e => set('file_path', e.target.value)} placeholder="/Documents/cv_v2.pdf" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors">
            {saving ? 'Saving…' : 'Add CV'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Add Interview Modal ──────────────────────────────────────────────────────

interface AddInterviewModalProps {
  opportunities: JobOpportunityItem[];
  onClose: () => void;
  onSaved: (interview: InterviewPrepItem) => void;
}

const AddInterviewModal: React.FC<AddInterviewModalProps> = ({ opportunities, onClose, onSaved }) => {
  const [form, setForm] = useState({
    opportunity_id: opportunities[0]?.id ?? 0,
    scheduled_at: '',
    interview_type: 'Technical',
    company_research: '',
    technical_questions: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.scheduled_at) { setErr('Scheduled date/time is required.'); return; }
    if (!form.opportunity_id) { setErr('Select an opportunity.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await api.createInterview({
        ...form,
        scheduled_at:        new Date(form.scheduled_at).toISOString(),
        company_research:    form.company_research    || undefined,
        technical_questions: form.technical_questions || undefined,
      });
      onSaved(res.interview);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error creating interview');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">Schedule Interview Prep</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {err && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{err}</p>}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Opportunity *</label>
            <select value={form.opportunity_id} onChange={e => set('opportunity_id', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500">
              {opportunities.map(o => <option key={o.id} value={o.id}>{o.title} @ {o.company}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Date &amp; Time *</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Interview Type</label>
            <select value={form.interview_type} onChange={e => set('interview_type', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500">
              {INTERVIEW_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Company Research Notes</label>
            <textarea value={form.company_research} onChange={e => set('company_research', e.target.value)} rows={2} placeholder="Key facts, tech stack, culture…" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Technical Topics to Prepare</label>
            <textarea value={form.technical_questions} onChange={e => set('technical_questions', e.target.value)} rows={2} placeholder="Python basics, REST APIs, SQL joins…" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors">
            {saving ? 'Saving…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Skills Gap Drawer ────────────────────────────────────────────────────────

interface SkillsGapDrawerProps {
  opportunity: JobOpportunityItem;
  onClose: () => void;
}

const SkillsGapDrawer: React.FC<SkillsGapDrawerProps> = ({ opportunity, onClose }) => {
  const [data, setData] = useState<SkillsGapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSkillsGap(opportunity.id)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [opportunity.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-slate-900 border-l border-slate-700 w-full sm:w-96 h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Skills Gap Analysis</h2>
            <p className="text-xs text-slate-400 mt-0.5">{opportunity.title} @ {opportunity.company}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 flex-1">
          {loading && <p className="text-sm text-slate-400 text-center py-8">Analysing your profile…</p>}
          {error  && <p className="text-sm text-red-400">{error}</p>}
          {data && (
            <div className="space-y-5">
              <div className="text-center py-3">
                <ReadinessBadge indicator={data.readiness_indicator} />
              </div>
              {data.matched_skills.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Matched Skills</h3>
                  <div className="space-y-2">
                    {data.matched_skills.map((m, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${m.status === 'Strong Match' ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {m.skill}
                            <span className={`ml-2 text-xs ${m.status === 'Strong Match' ? 'text-emerald-400' : 'text-amber-400'}`}>· {m.status}</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{m.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.gap_skills.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Gaps to Address</h3>
                  <div className="space-y-2">
                    {data.gap_skills.map((g, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-xl border border-red-500/20">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-200">{g.skill}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{g.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.matched_skills.length === 0 && data.gap_skills.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Add skill requirements to the opportunity to run analysis.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Opportunity Card ─────────────────────────────────────────────────────────

interface OppCardProps {
  opp: JobOpportunityItem;
  onStageChange: (id: number, stage: PipelineStage) => void;
  onDelete: (id: number) => void;
  onAnalyse: (opp: JobOpportunityItem) => void;
}

const OppCard: React.FC<OppCardProps> = ({ opp, onStageChange, onDelete, onAnalyse }) => {
  const [moving, setMoving] = useState(false);
  const days = daysUntil(opp.closing_date);
  const isUrgent = opp.closing_date && days !== '' && days !== 'Closed' && parseInt(days) <= 7;

  const advanceStage = async () => {
    const idx = PIPELINE_STAGES.indexOf(opp.pipeline_stage as PipelineStage);
    if (idx < 0 || idx >= PIPELINE_STAGES.length - 1) return;
    const next = PIPELINE_STAGES[idx + 1];
    setMoving(true);
    try { await onStageChange(opp.id, next); } finally { setMoving(false); }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 hover:border-slate-600 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-100 truncate">{opp.title}</h4>
          <p className="text-xs text-slate-400">{opp.company} · {opp.location}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onAnalyse(opp)} title="Skills Gap Analysis" className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-purple-400 transition-colors">
            <Zap className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(opp.id)} title="Delete" className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">{opp.job_type}</span>
        <StageBadge stage={opp.pipeline_stage as PipelineStage} />
        {days && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${isUrgent ? 'text-red-300 bg-red-500/15' : 'text-slate-400 bg-slate-700/40'}`}>
            {days}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <PriorityStars priority={opp.priority} />
        <div className="flex gap-1">
          {opp.application_url && (
            <a href={opp.application_url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {opp.pipeline_stage !== 'Rejected' && opp.pipeline_stage !== 'Offer' && (
            <button
              onClick={advanceStage}
              disabled={moving}
              title="Advance stage"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-300 hover:bg-slate-700 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'pipeline' | 'cv' | 'interviews';

export const CareerPage: React.FC = () => {
  const [tab, setTab] = useState<TabId>('pipeline');

  // Pipeline
  const [opportunities, setOpportunities] = useState<JobOpportunityItem[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [showAddOpp, setShowAddOpp] = useState(false);
  const [gapTarget, setGapTarget] = useState<JobOpportunityItem | null>(null);
  const [filterStage, setFilterStage] = useState<PipelineStage | 'All'>('All');

  // CV
  const [cvs, setCvs] = useState<CVDocumentItem[]>([]);
  const [loadingCvs, setLoadingCvs] = useState(false);
  const [showAddCV, setShowAddCV] = useState(false);

  // Interviews
  const [interviews, setInterviews] = useState<InterviewPrepItem[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [showAddInterview, setShowAddInterview] = useState(false);

  const loadOpportunities = useCallback(async () => {
    setLoadingOpps(true);
    try {
      const res = await api.getOpportunities();
      setOpportunities(res.opportunities);
      setStageCounts(res.stage_counts);
    } catch (e) { console.error(e); }
    finally { setLoadingOpps(false); }
  }, []);

  const loadCVs = useCallback(async () => {
    setLoadingCvs(true);
    try { const res = await api.getCVs(); setCvs(res.cv_documents); }
    catch (e) { console.error(e); }
    finally { setLoadingCvs(false); }
  }, []);

  const loadInterviews = useCallback(async () => {
    setLoadingInterviews(true);
    try { const res = await api.getInterviews(); setInterviews(res.interviews); }
    catch (e) { console.error(e); }
    finally { setLoadingInterviews(false); }
  }, []);

  useEffect(() => { loadOpportunities(); }, [loadOpportunities]);
  useEffect(() => { if (tab === 'cv') loadCVs(); }, [tab, loadCVs]);
  useEffect(() => { if (tab === 'interviews') loadInterviews(); }, [tab, loadInterviews]);

  const handleStageChange = async (id: number, stage: PipelineStage) => {
    await api.updateOpportunityStage(id, stage);
    await loadOpportunities();
  };

  const handleDeleteOpp = async (id: number) => {
    if (!confirm('Delete this opportunity?')) return;
    await api.deleteOpportunity(id);
    await loadOpportunities();
  };

  const handleDeleteCV = async (id: number) => {
    if (!confirm('Delete this CV document?')) return;
    await api.deleteCV(id);
    await loadCVs();
  };

  const filteredOpps = filterStage === 'All'
    ? opportunities
    : opportunities.filter(o => o.pipeline_stage === filterStage);

  const totalActive = (stageCounts['Saved'] || 0) + (stageCounts['Preparing'] || 0)
    + (stageCounts['Applied'] || 0) + (stageCounts['Interview'] || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Career &amp; Job Management</h1>
          <p className="text-sm text-slate-400 mt-1">IT Opportunities · Pipeline Kanban · Multi-version CVs · Skills-Gap Analysis</p>
        </div>
        <button
          onClick={() => setShowAddOpp(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Opportunity
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active',     value: totalActive,                   icon: Briefcase,  color: 'text-purple-400' },
          { label: 'Applied',    value: stageCounts['Applied'] || 0,   icon: TrendingUp, color: 'text-amber-400'  },
          { label: 'Interviews', value: stageCounts['Interview'] || 0, icon: Users,      color: 'text-blue-400'   },
          { label: 'Offers',     value: stageCounts['Offer'] || 0,     icon: Award,      color: 'text-emerald-400'},
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-xl font-bold text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        {([['pipeline', 'Pipeline'], ['cv', 'CV Library'], ['interviews', 'Interviews']] as [TabId, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Pipeline Tab ── */}
      {tab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['All', ...PIPELINE_STAGES] as (PipelineStage | 'All')[]).map(s => (
              <button
                key={s}
                onClick={() => setFilterStage(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterStage === s ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {s}{s !== 'All' && stageCounts[s] !== undefined ? ` (${stageCounts[s]})` : ''}
              </button>
            ))}
          </div>
          {loadingOpps ? (
            <div className="text-center py-16 text-slate-500 text-sm">Loading opportunities…</div>
          ) : filteredOpps.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
              <Briefcase className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No opportunities yet</p>
              <p className="text-slate-600 text-xs mt-1">Click "Add Opportunity" to start tracking your job search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredOpps.map(opp => (
                <OppCard
                  key={opp.id}
                  opp={opp}
                  onStageChange={handleStageChange}
                  onDelete={handleDeleteOpp}
                  onAnalyse={o => setGapTarget(o)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CV Library Tab ── */}
      {tab === 'cv' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddCV(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors border border-slate-700">
              <Plus className="w-4 h-4" /> Add CV Document
            </button>
          </div>
          {loadingCvs ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading…</div>
          ) : cvs.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
              <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No CV documents tracked</p>
              <p className="text-slate-600 text-xs mt-1">Add your CV versions here to link them to applications.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cvs.map(cv => (
                <div key={cv.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-100 truncate">{cv.title}</h4>
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full inline-block mt-1">{cv.category}</span>
                    </div>
                    <button onClick={() => handleDeleteCV(cv.id)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {cv.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cv.notes}</p>}
                  {cv.file_path && <p className="text-xs text-slate-600 mt-2 font-mono truncate">{cv.file_path}</p>}
                  <p className="text-xs text-slate-600 mt-2">Updated {new Date(cv.updated_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Interviews Tab ── */}
      {tab === 'interviews' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddInterview(true)}
              disabled={opportunities.length === 0}
              title={opportunities.length === 0 ? 'Add an opportunity first' : ''}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-xl transition-colors border border-slate-700"
            >
              <Calendar className="w-4 h-4" /> Schedule Interview
            </button>
          </div>
          {loadingInterviews ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading…</div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
              <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No interviews scheduled</p>
              <p className="text-slate-600 text-xs mt-1">Log an interview to track your preparation checklist.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interviews.map(iv => (
                <div key={iv.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">{iv.interview_type} Interview</span>
                      <p className="text-sm text-slate-300 mt-0.5">
                        {new Date(iv.scheduled_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {iv.checklist.filter(c => c.done).length}/{iv.checklist.length} items done
                    </span>
                  </div>
                  {iv.checklist.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {iv.checklist.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {c.done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            : <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />}
                          <span className={`text-xs ${c.done ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{c.item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {iv.company_research && (
                    <div className="mt-2 p-2 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-500 font-medium mb-0.5">Company Research</p>
                      <p className="text-xs text-slate-400">{iv.company_research}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddOpp && (
        <AddOppModal
          onClose={() => setShowAddOpp(false)}
          onSaved={opp => {
            setOpportunities(prev => [opp, ...prev]);
            setStageCounts(prev => ({ ...prev, [opp.pipeline_stage]: (prev[opp.pipeline_stage] || 0) + 1 }));
            setShowAddOpp(false);
          }}
        />
      )}
      {showAddCV && (
        <AddCVModal
          onClose={() => setShowAddCV(false)}
          onSaved={cv => { setCvs(prev => [cv, ...prev]); setShowAddCV(false); }}
        />
      )}
      {showAddInterview && (
        <AddInterviewModal
          opportunities={opportunities}
          onClose={() => setShowAddInterview(false)}
          onSaved={iv => { setInterviews(prev => [iv, ...prev]); setShowAddInterview(false); }}
        />
      )}
      {gapTarget && <SkillsGapDrawer opportunity={gapTarget} onClose={() => setGapTarget(null)} />}
    </div>
  );
};
