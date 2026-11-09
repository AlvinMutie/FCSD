import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, CheckCircle2, X, AlertCircle, Clock } from 'lucide-react';
import { api } from '../services/api';
import { AcademicTerm } from '../types';

interface SemesterSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (term: AcademicTerm) => void;
}

export const SemesterSetupModal: React.FC<SemesterSetupModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [termName, setTermName] = useState('Year 2 Semester 2');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [effectiveStartDate, setEffectiveStartDate] = useState('2026-11-09');

  useEffect(() => {
    if (!isOpen) return;
    const fetchTerm = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getCurrentTerm();
        if (res.term) {
          setTermName(res.term.name || 'Year 2 Semester 2');
          if (res.term.start_date) setStartDate(res.term.start_date);
          if (res.term.end_date) setEndDate(res.term.end_date);
          if (res.term.effective_start_date) {
            setEffectiveStartDate(res.term.effective_start_date);
          } else {
            setEffectiveStartDate(res.term.today || '2026-11-09');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load semester setup');
      } finally {
        setLoading(false);
      }
    };
    fetchTerm();
  }, [isOpen]);

  if (!isOpen) return null;

  // Compute metrics
  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  const effDate = new Date(effectiveStartDate);

  const totalSemesterWeeks = Math.max(1, Math.ceil((eDate.getTime() - sDate.getTime()) / (7 * 86400000)));
  const remainingStudyWeeks = Math.max(1, Math.ceil((eDate.getTime() - effDate.getTime()) / (7 * 86400000)));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await api.configureCurrentTerm({
        name: termName,
        start_date: startDate,
        end_date: endDate,
        effective_start_date: effectiveStartDate,
      });
      if (onSaved) onSaved(res.term);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save semester dates');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Semester Period Setup</h2>
              <p className="text-xs text-slate-400">Configure your semester timeline before syncing units or generating your timetable</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading semester configuration...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Semester Title */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Semester Name / Academic Level</label>
              <input
                type="text"
                required
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                placeholder="e.g. Year 2 Semester 2"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Official Semester Span */}
            <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Official Semester Timeline
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Official Semester Start</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. September start</span>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Official Semester End</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. December 31 exams</span>
                </div>
              </div>
            </div>

            {/* Actual Enrollment / Start Date (Strike adjustment) */}
            <div className="p-3.5 rounded-2xl bg-brand-500/5 border border-brand-500/25 space-y-2">
              <div className="flex items-center gap-1.5 text-brand-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Your Actual Enrollment / Study Start</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                If classes were delayed by teacher strikes or late enrollment, specify your actual start date here.
                The system will schedule your units only across your active study period!
              </p>
              <div>
                <input
                  type="date"
                  required
                  value={effectiveStartDate}
                  onChange={(e) => setEffectiveStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-brand-500/40 rounded-xl px-3 py-2 text-sm text-brand-200 font-semibold focus:outline-none focus:border-brand-400"
                />
              </div>
            </div>

            {/* Calculated summary pill */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[11px]">Calculated Active Window</span>
                <span className="text-slate-200 font-semibold">
                  {effectiveStartDate} → {endDate} ({remainingStudyWeeks} study weeks remaining)
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                ✓ Ready to Sync
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-brand-500/20 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Semester Timeline'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

