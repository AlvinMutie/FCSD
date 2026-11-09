import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, Calendar, Target } from 'lucide-react';
import { api } from '../../services/api';

interface DomainData {
  domain: string;
  planned_hours: number;
  completed_hours: number;
}

interface SkillTrackData {
  track: string;
  target_hours: number;
  actual_hours: number;
  completion_pct: number;
  color_hex: string;
}

interface UpcomingDeadline {
  type: string;
  title: string;
  due: string | null;
}

interface CareerSummary {
  saved: number;
  applied: number;
  interview: number;
}

interface WeeklySummary {
  week_start: string;
  week_end: string;
  domain_breakdown: DomainData[];
  skills_tracks: SkillTrackData[];
  neglect_alerts: string[];
  upcoming_deadlines: UpcomingDeadline[];
  career_summary: CareerSummary;
}

interface DistributionData {
  name: string;
  hours: number;
  color: string;
}

interface TimeDistribution {
  distribution: DistributionData[];
  total_logged_hours: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold text-slate-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {p.value}h</p>
      ))}
    </div>
  );
};

export const AnalyticsPage: React.FC = () => {
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [distribution, setDistribution] = useState<TimeDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [w, d] = await Promise.all([
        api.getWeeklyAnalytics(),
        api.getTimeDistribution(),
      ]);
      setWeekly(w);
      setDistribution(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading analytics...</div>;
  if (error) return <div className="text-red-400 p-6">{error}</div>;
  if (!weekly) return null;

  const weekLabel = `${new Date(weekly.week_start).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} - ${new Date(weekly.week_end).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Analytics & Life Balance</h1>
          <p className="text-sm text-slate-400 mt-1">Week of {weekLabel} · Planned vs Actual · Neglect Alerts</p>
        </div>
        <button onClick={load} className="text-sm text-slate-400 hover:text-slate-200 bg-slate-800 px-3 py-2 rounded-lg transition-colors">
          Refresh
        </button>
      </div>

      {weekly.neglect_alerts.length > 0 && (
        <div className="space-y-2">
          {weekly.neglect_alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200">{alert}</p>
            </div>
          ))}
        </div>
      )}
      {weekly.neglect_alerts.length === 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-emerald-200">No neglect alerts this week - all domains have recorded activity.</p>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" /> This Week - Planned vs Completed Hours
        </h2>
        {weekly.domain_breakdown.every(d => d.planned_hours === 0 && d.completed_hours === 0) ? (
          <p className="text-sm text-slate-500 text-center py-8">No calendar events scheduled for this week yet. Generate a schedule in the Timetable section.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly.domain_breakdown} barCategoryGap="30%">
              <XAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="planned_hours" name="Planned" fill="#6366f1" opacity={0.4} radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed_hours" name="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" /> Skills Track - Weekly Targets
        </h2>
        <div className="space-y-3">
          {weekly.skills_tracks.map(sk => (
            <div key={sk.track}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-300">{sk.track}</span>
                <span className="text-xs text-slate-400">{sk.actual_hours}h / {sk.target_hours}h target</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(sk.completion_pct, 100)}%`,
                    backgroundColor: sk.color_hex,
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-xs text-slate-600">{sk.completion_pct}% complete</span>
                {sk.actual_hours >= sk.target_hours && (
                  <span className="text-xs text-emerald-400">✓ Target met</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {distribution && distribution.distribution.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" /> All-Time Logged Hours Distribution
          </h2>
          <p className="text-xs text-slate-500 mb-4">Total: {distribution.total_logged_hours}h logged across all completed calendar events</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={distribution.distribution} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {distribution.distribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v ?? 0}h`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {distribution.distribution.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-sm text-slate-300">{d.name}</span>
                  <span className="text-sm text-slate-500 ml-auto pl-4">{d.hours}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Career Pipeline Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Saved / Tracking', value: weekly.career_summary.saved, color: 'text-slate-300' },
              { label: 'Applications Sent', value: weekly.career_summary.applied, color: 'text-amber-300' },
              { label: 'Interview Stage', value: weekly.career_summary.interview, color: 'text-purple-300' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <span className="text-sm text-slate-400">{s.label}</span>
                <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Upcoming Deadlines This Week</h2>
          {weekly.upcoming_deadlines.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No deadlines this week.</p>
          ) : (
            <div className="space-y-2">
              {weekly.upcoming_deadlines.map((d, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 bg-slate-800/50 rounded-xl">
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">{d.type}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-300 font-medium truncate">{d.title}</p>
                    {d.due && <p className="text-xs text-slate-500">{new Date(d.due).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
