import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderGit2, Plus, ExternalLink, Trash2, ChevronDown, ChevronRight,
  CheckCircle2, Circle, X
} from 'lucide-react';

interface MilestoneTask {
  id: number;
  milestone_id: number;
  title: string;
  is_completed: boolean;
  order_index: number;
  estimated_hours: number | null;
  notes: string | null;
}

interface ProjectMilestone {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  order_index: number;
  due_date: string | null;
  completion_percentage: number;
  tasks: MilestoneTask[];
}

interface ProjectItem {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: string;
  project_type: string;
  linked_skill_track: string | null;
  github_url: string | null;
  live_url: string | null;
  start_date: string | null;
  target_completion: string | null;
  priority: number;
  tags: string | null;
  completion_percentage: number;
  total_milestones: number;
  completed_milestones: number;
  created_at: string;
}

interface ProjectDetail extends ProjectItem {
  milestones: ProjectMilestone[];
}

const PROJECT_STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Archived'];
const PROJECT_TYPES = ['Academic', 'Skill-Building', 'Portfolio', 'Career', 'Personal'];
const SKILL_TRACKS = ['Python', 'Cybersecurity', 'Web Development', 'Networking'];
const STATUS_COLORS: Record<string, string> = {
  'Planning':    'text-blue-300 bg-blue-500/15',
  'In Progress': 'text-emerald-300 bg-emerald-500/15',
  'On Hold':     'text-amber-300 bg-amber-500/15',
  'Completed':   'text-purple-300 bg-purple-500/15',
  'Archived':    'text-slate-400 bg-slate-700/40',
};

const BASE = '/api';

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(e.error || 'Request failed');
  }
  return r.json();
}

interface AddProjectModalProps {
  onClose: () => void;
  onSaved: (p: ProjectItem) => void;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: '', description: '', status: 'Planning', project_type: 'Portfolio',
    linked_skill_track: '', github_url: '', live_url: '',
    start_date: '', target_completion: '', priority: 3, tags: ''
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) { setErr('Project title is required.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          start_date: form.start_date || undefined,
          target_completion: form.target_completion || undefined,
          linked_skill_track: form.linked_skill_track || undefined,
          github_url: form.github_url || undefined,
          live_url: form.live_url || undefined,
          tags: form.tags || undefined,
        })
      });
      onSaved(res.project);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">New Project</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          {err && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{err}</p>}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Project Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Personal Portfolio Website" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select value={form.project_type} onChange={e => set('project_type', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500">
                {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500">
                {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Linked Skill Track</label>
              <select value={form.linked_skill_track} onChange={e => set('linked_skill_track', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500">
                <option value="">None</option>
                {SKILL_TRACKS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Priority (1-5)</label>
              <input type="number" min={1} max={5} value={form.priority} onChange={e => set('priority', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Completion</label>
              <input type="date" value={form.target_completion} onChange={e => set('target_completion', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">GitHub URL</label>
            <input value={form.github_url} onChange={e => set('github_url', e.target.value)} placeholder="https://github.com/..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Live URL</label>
            <input value={form.live_url} onChange={e => set('live_url', e.target.value)} placeholder="https://..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Flask, React, Portfolio" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors">
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProjectDetailPanelProps {
  project: ProjectDetail;
  onClose: () => void;
  onUpdate: () => void;
}

const ProjectDetailPanel: React.FC<ProjectDetailPanelProps> = ({ project, onClose, onUpdate }) => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(project.milestones);
  const [newMilestone, setNewMilestone] = useState('');
  const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set(milestones.map(m => m.id)));
  const [newTasks, setNewTasks] = useState<Record<number, string>>({});

  const toggleMilestone = (id: number) => {
    setExpandedMilestones(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const addMilestone = async () => {
    if (!newMilestone.trim()) return;
    try {
      const res = await apiFetch(`/projects/${project.id}/milestones`, {
        method: 'POST',
        body: JSON.stringify({ title: newMilestone.trim() })
      });
      setMilestones(prev => [...prev, { ...res.milestone, tasks: [] }]);
      setNewMilestone('');
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const deleteMilestone = async (milestoneId: number) => {
    if (!confirm('Delete this milestone and all its tasks?')) return;
    try {
      await apiFetch(`/projects/milestones/${milestoneId}`, { method: 'DELETE' });
      setMilestones(prev => prev.filter(m => m.id !== milestoneId));
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const addTask = async (milestoneId: number) => {
    const title = (newTasks[milestoneId] || '').trim();
    if (!title) return;
    try {
      const res = await apiFetch(`/projects/milestones/${milestoneId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title })
      });
      setMilestones(prev => prev.map(m =>
        m.id === milestoneId
          ? { ...m, tasks: [...m.tasks, res.task] }
          : m
      ));
      setNewTasks(prev => ({ ...prev, [milestoneId]: '' }));
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const toggleTask = async (taskId: number, milestoneId: number) => {
    try {
      const res = await apiFetch(`/projects/tasks/${taskId}/toggle`, { method: 'PATCH' });
      setMilestones(prev => prev.map(m =>
        m.id === milestoneId
          ? { ...m, tasks: m.tasks.map(t => t.id === taskId ? res.task : t) }
          : m
      ));
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const deleteTask = async (taskId: number, milestoneId: number) => {
    try {
      await apiFetch(`/projects/tasks/${taskId}`, { method: 'DELETE' });
      setMilestones(prev => prev.map(m =>
        m.id === milestoneId
          ? { ...m, tasks: m.tasks.filter(t => t.id !== taskId) }
          : m
      ));
      onUpdate();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-slate-900 border-l border-slate-700 w-full sm:w-[480px] h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-slate-100 truncate">{project.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status] || 'text-slate-400'}`}>{project.status}</span>
                <span className="text-xs text-slate-500">{project.project_type}</span>
                {project.linked_skill_track && <span className="text-xs text-indigo-400">{project.linked_skill_track}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg flex-shrink-0"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Overall Progress</span>
              <span className="text-xs font-semibold text-slate-200">{project.completion_percentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full">
              <div
                className="h-1.5 bg-indigo-500 rounded-full transition-all"
                style={{ width: `${project.completion_percentage}%` }}
              />
            </div>
          </div>
          {(project.github_url || project.live_url) && (
            <div className="flex gap-2 mt-3">
              {project.github_url && (
                <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                  <FolderGit2 className="w-3.5 h-3.5" /> GitHub
                </a>
              )}
              {project.live_url && (
                <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Live
                </a>
              )}
            </div>
          )}
        </div>

        <div className="p-5 flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Milestones</h3>
            <span className="text-xs text-slate-500">{project.completed_milestones}/{project.total_milestones} done</span>
          </div>

          {milestones.map(m => (
            <div key={m.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-3">
                <button onClick={() => toggleMilestone(m.id)} className="text-slate-400 hover:text-slate-200">
                  {expandedMilestones.has(m.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{m.title}</p>
                  {m.due_date && <p className="text-xs text-slate-500">Due {new Date(m.due_date).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{m.completion_percentage}%</span>
                  <button onClick={() => deleteMilestone(m.id)} className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="h-0.5 bg-slate-700">
                <div className="h-0.5 bg-indigo-500 transition-all" style={{ width: `${m.completion_percentage}%` }} />
              </div>

              {expandedMilestones.has(m.id) && (
                <div className="p-3 space-y-1.5">
                  {m.tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 group">
                      <button onClick={() => toggleTask(t.id, m.id)} className="flex-shrink-0">
                        {t.is_completed
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          : <Circle className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                        }
                      </button>
                      <span className={`text-sm flex-1 min-w-0 ${t.is_completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{t.title}</span>
                      {t.estimated_hours && <span className="text-xs text-slate-600">{t.estimated_hours}h</span>}
                      <button onClick={() => deleteTask(t.id, m.id)} className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 text-slate-500 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      value={newTasks[m.id] || ''}
                      onChange={e => setNewTasks(prev => ({ ...prev, [m.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addTask(m.id)}
                      placeholder="Add task..."
                      className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button onClick={() => addTask(m.id)} className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors">Add</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <input
              value={newMilestone}
              onChange={e => setNewMilestone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMilestone()}
              placeholder="Add milestone..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={addMilestone} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProjectCardProps {
  project: ProjectItem;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, onDelete }) => (
  <div
    className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 cursor-pointer transition-all group"
    onClick={() => onSelect(project.id)}
  >
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-slate-100 truncate">{project.title}</h4>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status] || 'text-slate-400'}`}>{project.status}</span>
          <span className="text-xs text-slate-500">{project.project_type}</span>
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(project.id); }}
        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>

    {project.description && (
      <p className="text-xs text-slate-400 line-clamp-2 mb-3">{project.description}</p>
    )}

    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">{project.completed_milestones}/{project.total_milestones} milestones</span>
        <span className="text-xs font-semibold text-slate-300">{project.completion_percentage}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full">
        <div
          className="h-1.5 bg-indigo-500 rounded-full transition-all"
          style={{ width: `${project.completion_percentage}%` }}
        />
      </div>
    </div>

    <div className="flex items-center justify-between">
      <div className="flex gap-1">
        {project.linked_skill_track && (
          <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{project.linked_skill_track}</span>
        )}
        {project.tags && project.tags.split(',').slice(0, 2).map(tag => (
          <span key={tag} className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{tag.trim()}</span>
        ))}
      </div>
      <div className="flex gap-1">
        {project.github_url && (
          <a href={project.github_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1 hover:text-slate-200 text-slate-500 transition-colors">
            <FolderGit2 className="w-3.5 h-3.5" />
          </a>
        )}
        {project.live_url && (
          <a href={project.live_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1 hover:text-slate-200 text-slate-500 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  </div>
);

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [stats, setStats] = useState({ total: 0, in_progress: 0, completed: 0, planning: 0 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/projects');
      setProjects(res.projects);
      setStats(res.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const selectProject = async (id: number) => {
    try {
      const res = await apiFetch(`/projects/${id}`);
      setSelectedProject({ ...res.project, milestones: res.milestones });
    } catch (e) { console.error(e); }
  };

  const deleteProject = async (id: number) => {
    if (!confirm('Delete this project and all its milestones?')) return;
    try {
      await apiFetch(`/projects/${id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
      await loadProjects();
    } catch (e) { console.error(e); }
  };

  const filteredProjects = filterStatus === 'All' ? projects : projects.filter(p => p.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">My Projects</h1>
          <p className="text-sm text-slate-400 mt-1">Portfolio · Academic · Skill-Building · Career</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-300' },
          { label: 'Planning', value: stats.planning, color: 'text-blue-400' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-emerald-400' },
          { label: 'Completed', value: stats.completed, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['All', ...PROJECT_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
          <FolderGit2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No projects yet</p>
          <p className="text-slate-600 text-sm mt-1">Create your first project to track milestones and progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(p => (
            <ProjectCard key={p.id} project={p} onSelect={selectProject} onDelete={deleteProject} />
          ))}
        </div>
      )}

      {showAdd && <AddProjectModal onClose={() => setShowAdd(false)} onSaved={p => { setProjects(prev => [p, ...prev]); setStats(prev => ({ ...prev, total: prev.total + 1, planning: prev.planning + 1 })); setShowAdd(false); }} />}
      {selectedProject && <ProjectDetailPanel project={selectedProject} onClose={() => setSelectedProject(null)} onUpdate={loadProjects} />}
    </div>
  );
};
