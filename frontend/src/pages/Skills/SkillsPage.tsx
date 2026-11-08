import React, { useState, useEffect } from 'react';
import {
  Code2,
  Shield,
  Globe,
  Network,
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
  FileCode,
  FolderGit2,
  Square,
  CheckSquare,
  Trash2,
  Calendar,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  SkillTrack,
  LearningStageItem,
  LearningTaskItem,
  LearningSessionItem,
  LearningEvidenceItem,
} from '../../types';

export const SkillsPage: React.FC = () => {
  const [tracks, setTracks] = useState<SkillTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [stages, setStages] = useState<LearningStageItem[]>([]);
  const [sessions, setSessions] = useState<LearningSessionItem[]>([]);
  const [evidenceList, setEvidenceList] = useState<LearningEvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showLogSessionModal, setShowLogSessionModal] = useState(false);
  const [showAddEvidenceModal, setShowAddEvidenceModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<number | null>(null); // stage_id

  // Form states
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [sessionLearned, setSessionLearned] = useState('');
  const [sessionDifficulties, setSessionDifficulties] = useState('');
  const [sessionNext, setSessionNext] = useState('');

  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState<'GitHub' | 'Project' | 'Demo' | 'Certificate'>('GitHub');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskHours, setNewTaskHours] = useState(2.0);

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

      if (trRes.tracks.length > 0 && !selectedTrackId) {
        setSelectedTrackId(trRes.tracks[0].id);
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
    }
  }, [selectedTrackId]);

  const handleToggleTask = async (taskId: number) => {
    try {
      await api.toggleSkillTask(taskId);
      if (selectedTrackId) {
        const res = await api.getSkillRoadmap(selectedTrackId);
        setStages(res.stages);
      }
      const trRes = await api.getSkillsTracks();
      setTracks(trRes.tracks);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackId || !sessionTopic) return;
    try {
      await api.recordSkillSession({
        skill_id: selectedTrackId,
        topic_studied: sessionTopic,
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

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackId || !evidenceTitle || !evidenceUrl) return;
    try {
      await api.addSkillEvidence({
        skill_id: selectedTrackId,
        title: evidenceTitle,
        evidence_type: evidenceType,
        url_or_path: evidenceUrl,
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

  const handleDeleteEvidence = async (id: number) => {
    if (!confirm('Remove this practical evidence entry?')) return;
    try {
      await api.deleteSkillEvidence(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddTaskModal || !newTaskTitle) return;
    try {
      await api.addSkillTask(showAddTaskModal, {
        title: newTaskTitle,
        estimated_hours: Number(newTaskHours),
      });
      setShowAddTaskModal(null);
      setNewTaskTitle('');
      if (selectedTrackId) {
        const res = await api.getSkillRoadmap(selectedTrackId);
        setStages(res.stages);
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);

  const getTrackIcon = (name: string) => {
    if (name === 'Python') return <Code2 className="w-5 h-5 text-blue-400" />;
    if (name === 'Cybersecurity') return <Shield className="w-5 h-5 text-rose-400" />;
    if (name === 'Web Development') return <Globe className="w-5 h-5 text-emerald-400" />;
    return <Network className="w-5 h-5 text-purple-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Skills Development</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Target: ~3h/day = 21h/week</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Python &bull; Cybersecurity &bull; Web Development &bull; Networking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogSessionModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Log Study Reflection</span>
          </button>

          <button
            onClick={() => setShowAddEvidenceModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Evidence</span>
          </button>
        </div>
      </div>

      {/* 4 Tracks Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            onClick={() => setSelectedTrackId(track.id)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedTrackId === track.id
                ? 'bg-slate-900 border-brand-500/50 shadow-md ring-1 ring-brand-500/20'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-slate-800">
                {getTrackIcon(track.track_name)}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {track.current_level}
              </span>
            </div>

            <h4 className="font-bold text-slate-100 text-sm">{track.track_name}</h4>

            <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
              <span>This Week:</span>
              <span className="font-semibold text-slate-200">
                {track.weekly_hours_logged}h / {track.weekly_target_hours}h
              </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-emerald-400"
                style={{ width: `${Math.min(100, (track.weekly_hours_logged / (track.weekly_target_hours || 1)) * 100)}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
              <span>{track.completed_tasks_count}/{track.tasks_count} Tasks</span>
              <span>{track.evidence_count} Evidence</span>
            </div>
          </div>
        ))}
      </div>

      {/* Track Roadmap & Detailed Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stages & Learning Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                {selectedTrack?.track_name} &bull; Roadmap & Milestones
              </h3>
              <p className="text-xs text-slate-400">
                Progressive milestones from foundations to advanced practical applications
              </p>
            </div>
          </div>

          {stages.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
              No stages recorded for this track yet.
            </div>
          ) : (
            <div className="space-y-4">
              {stages.map((stage) => (
                <div key={stage.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400">Stage {stage.order_index}:</span>
                      <h4 className="text-xs font-semibold text-slate-200">{stage.title}</h4>
                    </div>
                    <button
                      onClick={() => setShowAddTaskModal(stage.id)}
                      className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Task</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {stage.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task.id)}
                        className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          {task.is_completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span className={`text-xs ${task.is_completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}>
                            {task.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                          ~{task.estimated_hours}h
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Session Reflections */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-semibold text-slate-200 text-sm">Study Sessions & Reflections</h4>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No study reflections recorded yet. Click 'Log Study Reflection' to record what you learned.</p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 5).map((s) => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-brand-400">{s.topic_studied}</span>
                      <span className="text-[11px] text-slate-400">{s.duration_mins} mins &bull; {new Date(s.session_date).toLocaleDateString()}</span>
                    </div>
                    {s.key_learnings && (
                      <p className="text-slate-300">
                        <strong className="text-slate-400">Learnings:</strong> {s.key_learnings}
                      </p>
                    )}
                    {s.difficulties_faced && (
                      <p className="text-amber-300/90">
                        <strong className="text-amber-400">Challenges:</strong> {s.difficulties_faced}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Practical Evidence Gallery */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-slate-300" />
              <h3 className="font-semibold text-slate-100 text-sm">Practical Evidence</h3>
            </div>
            <button
              onClick={() => setShowAddEvidenceModal(true)}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Learning is verified through real projects, GitHub codebases, demos, and screenshots rather than just time spent.
          </p>

          {evidenceList.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-6">No evidence items attached yet.</p>
          ) : (
            <div className="space-y-2.5">
              {evidenceList.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100">{item.title}</span>
                    <button
                      onClick={() => handleDeleteEvidence(item.id)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                  )}
                  <a
                    href={item.url_or_path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-brand-400 hover:underline pt-1"
                  >
                    <span>View Repository / Live Demo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Log Study Reflection */}
      {showLogSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Record Study Reflection</h3>
            <form onSubmit={handleRecordSession} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Track</label>
                <select
                  value={selectedTrackId ?? ''}
                  onChange={(e) => setSelectedTrackId(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.track_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Topic Studied</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Asynchronous Python AsyncIO & Tasks"
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  step="15"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">What did you understand?</label>
                <textarea
                  rows={2}
                  placeholder="Key concepts grasped..."
                  value={sessionLearned}
                  onChange={(e) => setSessionLearned(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                ></textarea>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Difficulties encountered?</label>
                <textarea
                  rows={2}
                  placeholder="Obstacles or confusion..."
                  value={sessionDifficulties}
                  onChange={(e) => setSessionDifficulties(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogSessionModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Save Reflection & Add Hours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Evidence */}
      {showAddEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Add Practical Learning Evidence</h3>
            <form onSubmit={handleAddEvidence} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Project / Repository Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Port Scanner in Python"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Evidence Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  <option value="GitHub">GitHub Repository</option>
                  <option value="Project">Live Project / Demo</option>
                  <option value="Certificate">Certificate / Milestone</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">URL / Link</label>
                <input
                  required
                  type="url"
                  placeholder="https://github.com/..."
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Short Description</label>
                <textarea
                  rows={2}
                  placeholder="What does this demonstrate..."
                  value={evidenceDesc}
                  onChange={(e) => setEvidenceDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEvidenceModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
                >
                  Save Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Task to Stage */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Add Roadmap Task</h3>
            <form onSubmit={handleAddTask} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Task Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Practice Socket Programming"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Estimated Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={newTaskHours}
                  onChange={(e) => setNewTaskHours(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
