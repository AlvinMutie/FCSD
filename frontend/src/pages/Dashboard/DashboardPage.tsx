import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  GraduationCap,
  Code2,
  Briefcase,
  PieChart as PieChartIcon,
  Settings2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { api } from '../../services/api';
import { DashboardOverview } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { settings, updateSettings } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const widgetsLayout = settings?.dashboard_layout?.widgets || [
    { id: 'todays_focus', title: "Today's Focus", visible: true, order: 1 },
    { id: 'academic_overview', title: 'Academic Overview & Balance', visible: true, order: 2 },
    { id: 'skills_overview', title: 'Skills Progress (4 Tracks)', visible: true, order: 3 },
    { id: 'career_overview', title: 'Career Pipeline', visible: true, order: 4 },
    { id: 'time_allocation', title: 'Time Distribution', visible: true, order: 5 },
  ];

  const handleToggleWidget = async (id: string) => {
    if (!settings) return;
    const newWidgets = widgetsLayout.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    await updateSettings({
      dashboard_layout: { widgets: newWidgets },
    });
  };

  const handleMoveWidget = async (index: number, direction: 'up' | 'down') => {
    if (!settings) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= widgetsLayout.length) return;

    const newWidgets = [...widgetsLayout];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[targetIndex];
    newWidgets[targetIndex] = temp;

    // Reassign order
    const ordered = newWidgets.map((w, idx) => ({ ...w, order: idx + 1 }));
    await updateSettings({
      dashboard_layout: { widgets: ordered },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400">Loading your OS workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
        <h3 className="font-semibold mb-1">Failed to load dashboard</h3>
        <p className="text-sm">{error || 'Unknown error'}</p>
        <button
          onClick={fetchOverview}
          className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'todays_focus':
        return (
          <div key="todays_focus" className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">Today's Focus</h3>
                  <p className="text-xs text-slate-400">Priority scheduling & session progress</p>
                </div>
              </div>
              <Link
                to="/timetable"
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
              >
                <span>Timetable</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-xs text-slate-400 block mb-1">Completed Sessions</span>
                <span className="text-xl font-bold text-slate-100">
                  {overview.todays_focus.completed_sessions_count} / {overview.todays_focus.scheduled_sessions_count}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-xs text-slate-400 block mb-1">Completion Rate</span>
                <span className="text-xl font-bold text-emerald-400">
                  {overview.todays_focus.completion_percentage}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-xs text-slate-400 block mb-1">Attention Overdue</span>
                <span className="text-xl font-bold text-amber-400">
                  {overview.todays_focus.overdue_count}
                </span>
              </div>
            </div>

            {overview.todays_focus.daily_priorities.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-dashed border-slate-700 text-center">
                <p className="text-xs text-slate-400">No scheduled sessions active for today yet.</p>
                <Link
                  to="/timetable"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-brand-400 hover:underline font-medium"
                >
                  Configure availability & generate weekly schedule
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {overview.todays_focus.daily_priorities.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-brand-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

      case 'academic_overview':
      case 'distinction_tracker':
        return (
          <div key="academic_overview" className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">Academic Overview & Distinction Track</h3>
                  <p className="text-xs text-slate-400">JKUAT SODeL unit coverage & equal attention</p>
                </div>
              </div>
              <Link
                to="/academics"
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
              >
                <span>Manage Units</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {overview.academic_overview.units.length === 0 ? (
              <div className="p-5 rounded-xl bg-slate-800/40 border border-dashed border-slate-700 text-center">
                <p className="text-sm font-medium text-slate-300 mb-1">No Academic Units Registered</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
                  Add your current semester units to enable the Academic Balance Engine and Distinction Planner.
                </p>
                <Link
                  to="/academics"
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 inline-flex items-center gap-1.5"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Add Units</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {overview.academic_overview.units.map((unit) => (
                  <div key={unit.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-brand-400 mr-2">{unit.code}</span>
                      <span className="text-xs font-medium text-slate-200">{unit.title}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">
                        {unit.actual_hours}h / {unit.target_hours}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'skills_overview':
        return (
          <div key="skills_overview" className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">Skills Progress</h3>
                  <p className="text-xs text-slate-400">4 Technical Tracks (Target: 3h/day = 21h/week)</p>
                </div>
              </div>
              <Link
                to="/skills"
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
              >
                <span>Roadmaps</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {overview.skills_overview.tracks.map((track) => (
                <div key={track.track} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <span className="text-xs font-semibold text-slate-200 block truncate">{track.track}</span>
                  <span className="text-xs text-brand-400 block mt-0.5">{track.hours_week} / {track.target_week}h</span>
                  <div className="w-full bg-slate-700/80 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (track.hours_week / (track.target_week || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'career_overview':
        return (
          <div key="career_overview" className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">Career & Job Pursuit</h3>
                  <p className="text-xs text-slate-400">Opportunity pipeline & interview readiness</p>
                </div>
              </div>
              <Link
                to="/career"
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
              >
                <span>Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-xs text-slate-400 block mb-1">Saved Roles</span>
                <span className="text-xl font-bold text-slate-100">{overview.career_overview.saved_count}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-xs text-slate-400 block mb-1">In Progress</span>
                <span className="text-xl font-bold text-brand-400">{overview.career_overview.in_progress_count}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-xs text-slate-400 block mb-1">Interviews</span>
                <span className="text-xl font-bold text-emerald-400">{overview.career_overview.interviews_count}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-xs text-slate-400 block mb-1">Weekly Target</span>
                <span className="text-xl font-bold text-purple-400">
                  {overview.career_overview.weekly_applications} / {overview.career_overview.target_weekly_applications}
                </span>
              </div>
            </div>
          </div>
        );

      case 'time_allocation':
        return (
          <div key="time_allocation" className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <PieChartIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">Time Allocation</h3>
                  <p className="text-xs text-slate-400">Distribution across major life pillars</p>
                </div>
              </div>
              <Link
                to="/analytics"
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
              >
                <span>Full Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="w-48 h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overview.time_allocation.filter((x) => x.hours > 0).length > 0 ? overview.time_allocation : [
                        { name: 'Academics Target', hours: 25, color: '#3b82f6' },
                        { name: 'Skills Target', hours: 21, color: '#10b981' },
                        { name: 'Career Target', hours: 5, color: '#8b5cf6' },
                        { name: 'Personal & Rest', hours: 30, color: '#f59e0b' },
                      ]}
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="hours"
                    >
                      {overview.time_allocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#f1f5f9', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-2 w-full">
                {overview.time_allocation.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-slate-300">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-200">{item.hours}h logged</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Overview Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Personal operating system &bull; Academic Distinction &bull; Technical Skills &bull; Career
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCustomizing(!customizing)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              customizing
                ? 'bg-brand-600 text-white border-brand-500'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{customizing ? 'Done Customizing' : 'Customize Widgets'}</span>
          </button>
        </div>
      </div>

      {/* Customization Drawer */}
      {customizing && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-brand-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
              Widget Ordering & Visibility
            </h4>
            <span className="text-xs text-slate-400">Changes persist to database</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {widgetsLayout.map((widget, idx) => (
              <div
                key={widget.id}
                className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleWidget(widget.id)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200"
                    title={widget.visible ? 'Hide widget' : 'Show widget'}
                  >
                    {widget.visible ? (
                      <Eye className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  <span className={`text-xs font-medium ${widget.visible ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                    {widget.title}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveWidget(idx, 'up')}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === widgetsLayout.length - 1}
                    onClick={() => handleMoveWidget(idx, 'down')}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ordered Widgets Grid */}
      <div className="space-y-6">
        {widgetsLayout
          .filter((w) => w.visible)
          .map((w) => renderWidget(w.id))}
      </div>
    </div>
  );
};

