import React, { useState, useEffect } from 'react';
import {
  Code2,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  BookOpen,
  Award,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FolderGit2,
  Square,
  CheckSquare,
  Trash2,
  X,
  Target,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  SkillTrack,
  LearningStageItem,
  LearningSessionItem,
  LearningEvidenceItem,
} from '../../types';

const POPULAR_SUGGESTIONS = [
  { name: 'React & Next.js', level: 'Beginner', hours: 3.0, color: '#3b82f6', goal: 'Component state, hooks & SSR' },
  { name: 'Machine Learning & AI', level: 'Beginner', hours: 3.0, color: '#8b5cf6', goal: 'Data preprocessing, regression & models' },
  { name: 'Docker & DevOps', level: 'Beginner', hours: 2.0, color: '#06b6d4', goal: 'Containerization & CI/CD pipelines' },
  { name: 'Cloud Computing (AWS / GCP)', level: 'Beginner', hours: 3.0, color: '#f59e0b', goal: 'Cloud architecture & serverless deployment' },
  { name: 'Mobile App Development (Flutter)', level: 'Beginner', hours: 3.0, color: '#10b981', goal: 'Cross-platform state & native features' },
  { name: 'Cybersecurity & Ethical Hacking', level: 'Beginner', hours: 3.0, color: '#ef4444', goal: 'Network defense, OWASP & vulnerability audits' },
];

const PRESET_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];

export const SkillsPage: React.FC = () => {
  const [tracks, setTracks] = useState<SkillTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [stages, setStages] = useState<LearningStageItem[]>([]);
  const [sessions, setSessions] = useState<LearningSessionItem[]>([]);
  const [evidenceList, setEvidenceList] = useState<LearningEvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [showLogSessionModal, setShowLogSessionModal] = useState(false);
  const [showAddEvidenceModal, setShowAddEvidenceModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<number | null>(null); // stage_id
  const [showAddStageModal, setShowAddStageModal] = useState(false);

  // Add Skill Form state
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('Beginner');
  const [newSkillHours, setNewSkillHours] = useState(3.0);
  const [newSkillColor, setNewSkillColor] = useState('#10b981');
  const [newSkillGoal, setNewSkillGoal] = useState('');

  // Log session form
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [sessionLearned, setSessionLearned] = useState('');
  const [sessionDifficulties, setSessionDifficulties] = useState('');
  const [sessionNext, setSessionNext] = useState('');

  // Add evidence form
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState<'GitHub' | 'Project' | 'Demo' | 'Certificate'>('GitHub');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');

  // Task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskHours, setNewTaskHours] = useState(1.0);

  // Stage form
  const [newStageTitle, setNewStageTitle] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [trRes, sessRes, evRes] = await Promise.all([
        api.getSkillsTracks(),
        api.getSkillSessions(),
        api.getSkillEvidence(),
      ]);
      setTracks(trRes.tracks);
      setSessions(sessRes.sessions);
      setEvidenceList(evRes.evidence);

      if (trRes.tracks.length > 0) {
        if (!selectedTrackId || !trRes.tracks.some(t => t.id === selectedTrackId)) {
          setSelectedTrackId(trRes.tracks[0].id);
        }
      } else {
        setSelectedTrackId(null);
        setStages([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTrackId) {
      api.getSkillRoadmap(selectedTrackId)
        .then((res) => setStages(res.stages))
        .catch((err) => console.error(err));
    } else {
      setStages([]);
    }
  }, [selectedTrackId]);

  // Create Skill
  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    try {
      const res = await api.createSkillTrack({
        track_name: newSkillName.trim(),
        current_level: newSkillLevel,
        weekly_target_hours: Number(newSkillHours),
        color_hex: newSkillColor,
        initial_goal: newSkillGoal.trim() || undefined,
      });
      setShowAddSkillModal(false);
      setNewSkillName('');
      setNewSkillGoal('');
      await loadData();
      if (res.track?.id) {
        setSelectedTrackId(res.track.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add skill');
    }
  };

  // Quick Add from Suggestion
  const handleQuickAdd = async (s: typeof POPULAR_SUGGESTIONS[0]) => {
    try {
      const res = await api.createSkillTrack({
        track_name: s.name,
        current_level: s.level,
        weekly_target_hours: s.hours,
        color_hex: s.color,
        initial_goal: s.goal,
      });
      await loadData();
      if (res.track?.id) {
        setSelectedTrackId(res.track.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add skill');
    }
  };

  // Delete Skill
  const handleDeleteSkill = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from your skills to learn?`)) return;
    try {
      await api.deleteSkillTrack(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete skill');
    }
  };

  // Task Completion
  const handleToggleTask = async (taskId: number) => {
    try {
      await api.toggleSkillTask(taskId);
      if (selectedTrackId) {
        const res = await api.getSkillRoadmap(selectedTrackId);
        setStages(res.stages);
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddTaskModal || !newTaskTitle.trim()) return;
    try {
      await api.addSkillTask(showAddTaskModal, {
        title: newTaskTitle.trim(),
        estimated_hours: Number(newTaskHours),
      });
      setShowAddTaskModal(null);
      setNewTaskTitle('');
      if (selectedTrackId) {
        const res = await api.getSkillRoadmap(selectedTrackId);
        setStages(res.stages);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Stage
  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackId || !newStageTitle.trim()) return;
    try {
      await api.addSkillStage(selectedTrackId, newStageTitle.trim());
      setShowAddStageModal(false);
      setNewStageTitle('');
      const res = await api.getSkillRoadmap(selectedTrackId);
      setStages(res.stages);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Log Practice Session
  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackId || !sessionTopic.trim()) return;
    try {
      await api.logSkillSession({
        skill_id: selectedTrackId,
        topic_studied: sessionTopic.trim(),
        duration_mins: Number(sessionDuration),
        key_learnings: sessionLearned,
        difficulties_faced: sessionDifficulties,
        next_steps: sessionNext,
      });
      setShowLogSessionModal(false);
      setSessionTopic('');
      setSessionLearned('');
      setSessionDifficulties('');
      setSessionNext('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Evidence
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackId || !evidenceTitle.trim() || !evidenceUrl.trim()) return;
    try {
      await api.addSkillEvidence({
        skill_id: selectedTrackId,
        title: evidenceTitle.trim(),
        evidence_type: evidenceType,
        url_or_path: evidenceUrl.trim(),
        description: evidenceDesc,
      });
      setShowAddEvidenceModal(false);
      setEvidenceTitle('');
      setEvidenceUrl('');
      setEvidenceDesc('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const totalWeeklyTarget = tracks.reduce((acc, t) => acc + (t.weekly_target_hours || 0), 0);
  const totalWeeklyLogged = tracks.reduce((acc, t) => acc + (t.weekly_hours_logged || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Skills Development</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              <span>1-Hour Study Day Sessions</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Choose what you want to learn &bull; Interleaved 1-hour sessions alongside academic study &bull; Practical project evidence
          </p>
        </div>

        <button
          onClick={() => setShowAddSkillModal(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-brand-500/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Skill I Want to Learn</span>
        </button>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm shrink-0">
            {tracks.length}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Custom Skills</span>
            <span className="text-sm font-bold text-slate-100">{tracks.length} active tracks</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Weekly Target</span>
            <span className="text-sm font-bold text-slate-100">{totalWeeklyTarget}h scheduled</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Logged This Week</span>
            <span className="text-sm font-bold text-slate-100">{totalWeeklyLogged}h practice</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
            {sessions.length}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Logged Sessions</span>
            <span className="text-sm font-bold text-slate-100">{sessions.length} practice logs</span>
          </div>
        </div>
      </div>

      {/* ══ EMPTY STATE (When no skills added yet) ══════════════ */}
      {tracks.length === 0 && (
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-dashed border-slate-700/80 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-100">Add the skills you want to learn</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instead of cluttering your week with full dedicated days, the scheduler will give each skill you add
              <strong> 1 hour</strong> per study day alongside your SODeL coursework!
            </p>
          </div>

          {/* Quick-add suggestions */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Popular Tracks to Learn
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
              {POPULAR_SUGGESTIONS.map((s) => (
                <button
                  key={s.name}
                  onClick={() => handleQuickAdd(s)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm group"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.name}</span>
                  <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowAddSkillModal(true)}
              className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-500/25 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Skill Track</span>
            </button>
          </div>
        </div>
      )}

      {/* ══ SKILLS GRID (When skills exist) ═════════════════════ */}
      {tracks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Your Active Skills</h2>
            <span className="text-xs text-slate-400">Click a skill to view its roadmap & log sessions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracks.map((track) => {
              const isSelected = track.id === selectedTrackId;
              const progressPct = track.weekly_target_hours > 0
                ? Math.min(100, Math.round((track.weekly_hours_logged / track.weekly_target_hours) * 100))
                : 0;

              return (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrackId(track.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-slate-900 border-brand-500/60 ring-2 ring-brand-500/20 shadow-xl'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900 shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-lg shrink-0" style={{ backgroundColor: track.color_hex }} />
                      <div>
                        <h3 className="font-bold text-slate-100 text-base leading-snug">{track.track_name}</h3>
                        <span className="text-[11px] text-slate-400 block">{track.current_level} Level</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSkill(track.id, track.track_name);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Remove skill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 mt-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Weekly Target</span>
                      </span>
                      <span className="text-slate-200 font-bold">
                        {track.weekly_hours_logged}h / {track.weekly_target_hours}h
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progressPct}%`,
                          backgroundColor: track.color_hex,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-400">{progressPct}% weekly target</span>
                      <span className="text-slate-400 font-medium">{track.total_hours_logged}h total logged</span>
                    </div>
                  </div>

                  {/* Footer hint */}
                  <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-brand-400 font-semibold">
                    <span>{isSelected ? 'Viewing Roadmap' : 'Click to View Roadmap'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ SELECTED SKILL ROADMAP & DETAILS ════════════════════ */}
      {selectedTrack && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-xl" style={{ backgroundColor: selectedTrack.color_hex }} />
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{selectedTrack.track_name} Roadmap</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    1-hour practice sessions scheduled into your week &bull; Track milestones & practical skills
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLogSessionModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Log 1h Practice Session</span>
                </button>
                <button
                  onClick={() => setShowAddEvidenceModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>Add Project Proof</span>
                </button>
              </div>
            </div>

            {/* Stages & Learning Tasks */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-400" />
                  <span>Milestones & Learning Tasks</span>
                </h3>
                <button
                  onClick={() => setShowAddStageModal(true)}
                  className="text-xs text-brand-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Milestone Stage</span>
                </button>
              </div>

              {stages.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-dashed border-slate-700 text-center space-y-2">
                  <p className="text-xs text-slate-400">No milestone stages created for this skill yet.</p>
                  <button
                    onClick={() => setShowAddStageModal(true)}
                    className="text-xs text-brand-400 font-bold hover:underline cursor-pointer"
                  >
                    + Add your first milestone stage
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {stages.map((stage) => (
                    <div key={stage.id} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                        <span className="font-bold text-slate-100 text-sm">{stage.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {stage.completed_count}/{stage.tasks_count} completed
                          </span>
                          <button
                            onClick={() => setShowAddTaskModal(stage.id)}
                            className="text-xs text-brand-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Task</span>
                          </button>
                        </div>
                      </div>

                      {stage.tasks.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-1">No tasks in this stage yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {stage.tasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => handleToggleTask(task.id)}
                              className="p-2.5 rounded-xl hover:bg-slate-700/50 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5">
                                {task.is_completed ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
                                )}
                                <span className={task.is_completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                                  {task.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">{task.estimated_hours}h</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Practice Sessions */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Recent Practice Sessions ({selectedTrack.track_name})</span>
              </h3>

              {sessions.filter((s) => s.skill_id === selectedTrack.id).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No practice sessions logged yet. Click "Log 1h Practice Session" above after practicing.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sessions
                    .filter((s) => s.skill_id === selectedTrack.id)
                    .slice(0, 4)
                    .map((s) => (
                      <div key={s.id} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>{s.session_date ? new Date(s.session_date).toLocaleDateString() : 'Recent'}</span>
                          <span className="font-semibold text-slate-200">{s.duration_mins} mins</span>
                        </div>
                        <h4 className="font-bold text-slate-100">{s.topic_studied}</h4>
                        {s.key_learnings && (
                          <p className="text-slate-300 text-[11px] line-clamp-2">Learned: {s.key_learnings}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Evidence & Project Artifacts */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-purple-400" />
                <span>Project Artifacts & Evidence</span>
              </h3>

              {evidenceList.filter((e) => e.skill_id === selectedTrack.id).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No project proofs linked yet. Add your GitHub repositories or project demos.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {evidenceList
                    .filter((e) => e.skill_id === selectedTrack.id)
                    .map((ev) => (
                      <div key={ev.id} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start justify-between text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                            {ev.evidence_type}
                          </span>
                          <h4 className="font-bold text-slate-100 pt-1">{ev.title}</h4>
                          {ev.description && <p className="text-slate-400 text-[11px]">{ev.description}</p>}
                        </div>
                        <a
                          href={ev.url_or_path}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Add Skill to Learn ══════════════════════════ */}
      {showAddSkillModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span>Add Skill I Want to Learn</span>
              </h3>
              <button onClick={() => setShowAddSkillModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSkill} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Skill Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. React Native, Machine Learning, Docker, Cloud / AWS"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Current Level</label>
                  <select
                    value={newSkillLevel}
                    onChange={(e) => setNewSkillLevel(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Weekly Target Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={newSkillHours}
                    onChange={(e) => setNewSkillHours(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Scheduled as 1h sessions</span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Color Tag</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewSkillColor(c)}
                      className={`w-6 h-6 rounded-lg transition-transform ${newSkillColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Initial Goal / Starter Topic (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Master core fundamentals and complete a practical demo"
                  value={newSkillGoal}
                  onChange={(e) => setNewSkillGoal(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSkillModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/20 cursor-pointer"
                >
                  Save & Add Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Add Milestone Stage ════════════════════════ */}
      {showAddStageModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-sm">Add Milestone Stage</h3>
            <form onSubmit={handleAddStage} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Stage Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Advanced State Management & APIs"
                  value={newStageTitle}
                  onChange={(e) => setNewStageTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStageModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold">
                  Add Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Add Task ════════════════════════════════════ */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-sm">Add Learning Task</h3>
            <form onSubmit={handleAddTask} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Task Description</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Build authentication demo with JWT"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Estimated Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={newTaskHours}
                  onChange={(e) => setNewTaskHours(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(null)}
                  className="px-3 py-1.5 text-slate-400 hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold">
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Log Practice Session ════════════════════════ */}
      {showLogSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">Log 1-Hour Practice Session</h3>
              <button onClick={() => setShowLogSessionModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogSession} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Topic Practiced</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Asynchronous programming & API handling"
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  step="15"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Key Takeaways & Reflection</label>
                <textarea
                  rows={2}
                  placeholder="What worked? What clicked during today's session?"
                  value={sessionLearned}
                  onChange={(e) => setSessionLearned(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLogSessionModal(false)}
                  className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl">
                  Log Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Add Evidence / Proof ════════════════════════ */}
      {showAddEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">Add Project Evidence</h3>
              <button onClick={() => setShowAddEvidenceModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEvidence} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Project Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Real-Time Chat System"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Evidence Type</label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="GitHub">GitHub Repository</option>
                    <option value="Project">Live Project</option>
                    <option value="Demo">Demo Video / Link</option>
                    <option value="Certificate">Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">URL / Link</label>
                  <input
                    required
                    type="url"
                    placeholder="https://github.com/..."
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEvidenceModal(false)}
                  className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl">
                  Save Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
