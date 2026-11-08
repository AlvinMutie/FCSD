import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Sliders, User, Clock, Moon, Shield, Save, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, settings, updateSettings } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'Africa/Nairobi');
  const [timeFormat, setTimeFormat] = useState(settings?.time_format || '24h');
  const [maxStudyHours, setMaxStudyHours] = useState(settings?.max_daily_study_hours || 8.0);
  const [skillsDailyTarget, setSkillsDailyTarget] = useState(settings?.skills_daily_target_hours || 3.0);
  const [careerWeeklyTarget, setCareerWeeklyTarget] = useState(settings?.career_weekly_apps_target || 3);

  // Priority weights
  const [urgencyWeight, setUrgencyWeight] = useState(settings?.priority_weights?.deadline_urgency ?? 0.35);
  const [importanceWeight, setImportanceWeight] = useState(settings?.priority_weights?.importance ?? 0.25);
  const [impactWeight, setImpactWeight] = useState(settings?.priority_weights?.impact ?? 0.20);
  const [difficultyWeight, setDifficultyWeight] = useState(settings?.priority_weights?.workload_difficulty ?? 0.10);
  const [riskWeight, setRiskWeight] = useState(settings?.priority_weights?.risk_of_falling_behind ?? 0.10);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setTimezone(user.timezone);
    }
    if (settings) {
      setTimeFormat(settings.time_format);
      setMaxStudyHours(settings.max_daily_study_hours);
      setSkillsDailyTarget(settings.skills_daily_target_hours);
      setCareerWeeklyTarget(settings.career_weekly_apps_target);
      if (settings.priority_weights) {
        setUrgencyWeight(settings.priority_weights.deadline_urgency ?? 0.35);
        setImportanceWeight(settings.priority_weights.importance ?? 0.25);
        setImpactWeight(settings.priority_weights.impact ?? 0.20);
        setDifficultyWeight(settings.priority_weights.workload_difficulty ?? 0.10);
        setRiskWeight(settings.priority_weights.risk_of_falling_behind ?? 0.10);
      }
    }
  }, [user, settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await updateSettings({
        display_name: displayName,
        timezone: timezone,
        time_format: timeFormat,
        max_daily_study_hours: Number(maxStudyHours),
        skills_daily_target_hours: Number(skillsDailyTarget),
        career_weekly_apps_target: Number(careerWeeklyTarget),
        priority_weights: {
          deadline_urgency: Number(urgencyWeight),
          importance: Number(importanceWeight),
          impact: Number(impactWeight),
          workload_difficulty: Number(difficultyWeight),
          risk_of_falling_behind: Number(riskWeight),
        },
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const totalWeights = (
    Number(urgencyWeight) +
    Number(importanceWeight) +
    Number(impactWeight) +
    Number(difficultyWeight) +
    Number(riskWeight)
  ).toFixed(2);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">System & Personal Settings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure scheduling engine weights, learning targets, and user profile
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
            <span>Preferences saved to database</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <User className="w-5 h-5 text-brand-400" />
            <h3 className="font-semibold text-slate-200">Personal Information & Localization</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Timezone (East Africa)</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Time Format</label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="24h">24-hour (14:00)</option>
                <option value="12h">12-hour (2:00 PM)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scheduling Preferences */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200">Scheduling Capacity & Targets</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Max Daily Study Cap (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="2"
                max="16"
                value={maxStudyHours}
                onChange={(e) => setMaxStudyHours(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Protects rest periods</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Skills Daily Target (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="8"
                value={skillsDailyTarget}
                onChange={(e) => setSkillsDailyTarget(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Initial target = 3.0h/day (21h/week)</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Career Weekly Applications
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={careerWeeklyTarget}
                onChange={(e) => setCareerWeeklyTarget(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Target job/internship applications</span>
            </div>
          </div>
        </div>

        {/* Priority Engine Weights */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-slate-200">Scheduling Engine Priority Weights</h3>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${totalWeights === '1.00' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              Sum: {totalWeights} (Norm: 1.00)
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Formula: P = 0.35D + 0.25U + 0.20I + 0.10W + 0.10R. Adjust weights based on your current semester goals.
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Deadline Urgency (D)</span>
                <span className="font-mono text-brand-400">{urgencyWeight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={urgencyWeight}
                onChange={(e) => setUrgencyWeight(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Academic / Career Importance (U)</span>
                <span className="font-mono text-indigo-400">{importanceWeight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={importanceWeight}
                onChange={(e) => setImportanceWeight(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Long-term Goal Impact (I)</span>
                <span className="font-mono text-purple-400">{impactWeight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={impactWeight}
                onChange={(e) => setImpactWeight(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Workload Difficulty (W)</span>
                <span className="font-mono text-amber-400">{difficultyWeight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={difficultyWeight}
                onChange={(e) => setDifficultyWeight(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Risk of Falling Behind (R)</span>
                <span className="font-mono text-rose-400">{riskWeight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={riskWeight}
                onChange={(e) => setRiskWeight(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50 cursor-pointer transition-all"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
