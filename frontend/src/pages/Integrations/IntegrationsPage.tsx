import React, { useState, useEffect } from 'react';
import {
  Puzzle,
  ShieldCheck,
  Key,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  Edit3,
  Clock,
  Layers,
  FileText,
  History,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';
import { IntegrationStatus, PendingImportItem, ImportHistoryItem } from '../../types';

export const IntegrationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'bridge' | 'history'>('pending');
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [pendingImports, setPendingImports] = useState<PendingImportItem[]>([]);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState(false);

  // Edit before approve modal
  const [editingItem, setEditingItem] = useState<PendingImportItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [st, pend, hist] = await Promise.all([
        api.getIntegrationStatus(),
        api.getPendingImports('ALL'),
        api.getImportHistory(),
      ]);
      setStatus(st);
      setPendingImports(pend.pending_imports);
      setHistory(hist.history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnect = async () => {
    try {
      await api.connectIntegration();
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect MyLife Bridge? This will revoke the active pairing token.')) return;
    try {
      await api.disconnectIntegration();
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToken = () => {
    if (status?.pairing_token) {
      navigator.clipboard.writeText(status.pairing_token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    }
  };

  const handleReview = async (importId: number, decision: 'APPROVE' | 'EDIT_AND_APPROVE' | 'REJECT' | 'ATTENTION', edits: any = {}) => {
    try {
      await api.reviewPendingImport(importId, decision, edits);
      setEditingItem(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditModal = (item: PendingImportItem) => {
    setEditingItem(item);
    setEditTitle(item.normalized_title);
    setEditCourseCode(item.normalized_course_code || '');
    setEditDeadline(item.normalized_deadline ? item.normalized_deadline.split('T')[0] : '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const unreviewedCount = pendingImports.filter((i) => i.status === 'Pending Review').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Integrations & MyLife Bridge</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Assisted Read-Only Sync</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Connect JKUAT SODeL securely &bull; Pending Imports Staging &bull; Human-in-the-Loop Review
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'pending' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending Imports ({unreviewedCount})
          </button>
          <button
            onClick={() => setActiveTab('bridge')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'bridge' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bridge Connection & Setup
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'history' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit History ({history.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PENDING IMPORTS REVIEW MANAGER */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Staged SODeL Imports</h3>
              <p className="text-xs text-slate-400">
                Items extracted by MyLife Bridge remain staged here until you approve, edit, or reject them.
              </p>
            </div>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {pendingImports.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-lg mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto">
                <Puzzle className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-200 text-sm">No Pending Imports Awaiting Review</h4>
              <p className="text-xs text-slate-400">
                Open JKUAT SODeL in Chrome, click the MyLife Bridge extension, and scan a course or assignment page.
              </p>
              <button
                onClick={() => setActiveTab('bridge')}
                className="mt-2 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
              >
                View Setup Instructions
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingImports.map((item) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    item.status === 'Pending Review'
                      ? 'bg-slate-900 border-brand-500/40 shadow-sm'
                      : item.status === 'Approved'
                      ? 'bg-emerald-950/10 border-emerald-500/20 opacity-80'
                      : 'bg-slate-900/50 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          {item.item_type}
                        </span>
                        {item.normalized_course_code && (
                          <span className="text-xs font-bold text-brand-400">
                            {item.normalized_course_code}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'Pending Review'
                              ? 'bg-amber-500/20 text-amber-400'
                              : item.status === 'Approved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h4 className="font-semibold text-slate-100 text-sm">{item.normalized_title}</h4>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        {item.normalized_deadline && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              Deadline: {new Date(item.normalized_deadline).toLocaleDateString()}
                              {item.has_explicit_time ? ` (${new Date(item.normalized_deadline).toLocaleTimeString()})` : ' (Date only)'}
                            </span>
                          </div>
                        )}
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-slate-400 hover:text-brand-400"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{item.source_url}</span>
                        </a>
                      </div>

                      {/* Diff Warning Banner if Existing Record Changed */}
                      {item.changes_diff && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>
                            Deadline difference detected compared to existing record: Previously{' '}
                            <strong>{new Date(item.changes_diff.deadline.old).toLocaleDateString()}</strong>, newly extracted{' '}
                            <strong>{new Date(item.changes_diff.deadline.new).toLocaleDateString()}</strong>.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions if Pending */}
                    {item.status === 'Pending Review' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleReview(item.id, 'APPROVE')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit & Approve</span>
                        </button>

                        <button
                          onClick={() => handleReview(item.id, 'REJECT')}
                          className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BRIDGE CONNECTION & SETUP */}
      {activeTab === 'bridge' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Pairing Token Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-brand-400" />
                  <h3 className="font-semibold text-slate-100">Extension Pairing Token</h3>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    status?.connected
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {status?.connected ? 'Paired & Ready' : 'Disconnected'}
                </span>
              </div>

              <p className="text-xs text-slate-400">
                This token authenticates the Chrome extension to your local MyLife OS instance. It is NOT an LMS password and can be revoked at any time.
              </p>

              {status?.connected && status.pairing_token ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                    <span className="flex-1 truncate">{status.pairing_token}</span>
                    <button
                      onClick={copyToken}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Last synchronization: {status.last_sync_at ? new Date(status.last_sync_at).toLocaleString() : 'Never'}
                    </span>
                    <button
                      onClick={handleDisconnect}
                      className="text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      Revoke & Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/20 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  <span>Generate Pairing Token</span>
                </button>
              )}
            </div>

            {/* Guided Synchronization Workflow */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-semibold text-slate-100 text-sm">Guided Synchronization: Sync My SODeL Units</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600/30 text-brand-400 font-bold text-xs shrink-0">
                    1
                  </span>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-200">Log into JKUAT SODeL</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Open <code className="text-brand-300">https://sodel3v2.jkuat.ac.ke</code> in Chrome and sign in normally. MyLife OS never asks for your password.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600/30 text-brand-400 font-bold text-xs shrink-0">
                    2
                  </span>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-200">Open Course or Assignment Page</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Navigate to any active unit or assignment page on SODeL.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600/30 text-brand-400 font-bold text-xs shrink-0">
                    3
                  </span>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-200">Click MyLife Bridge $\rightarrow$ Scan</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      The extension detects the page type, parses deadlines without inventing fake times, and sends it to MyLife OS Staging.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 font-bold text-xs shrink-0">
                    4
                  </span>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-200">Review & Approve in Pending Imports</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Confirm or edit the proposed import before it is written to your official academic records.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Architecture Sidebar */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="font-semibold text-slate-200 text-sm">Security & Privacy Protocol</h4>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero LMS password or credential harvesting.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>No cookie or session token storage.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Localhost-only API binding (no remote exposure).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Never assumes 11:59 PM deadlines unless specified.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Full audit provenance recorded for every approved item.</span>
              </li>
            </ul>

            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-[11px] text-slate-300">
              <strong>Extension location:</strong>
              <code className="block text-[10px] text-brand-300 mt-1 break-all">
                mylife-os/mylife-bridge
              </code>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Import Audit Provenance Log</h3>
              <p className="text-xs text-slate-400">Historical trace of every external record transitioned into academic tables</p>
            </div>
            <History className="w-5 h-5 text-slate-500" />
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No approved imports recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{record.item_title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                        {record.action_taken} $\rightarrow$ {record.target_table}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate max-w-md">
                      Source: {record.source_url}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(record.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Edit Before Approve */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Edit Before Approving</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Course Code</label>
                <input
                  type="text"
                  value={editCourseCode}
                  onChange={(e) => setEditCourseCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Deadline Date</label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleReview(editingItem.id, 'EDIT_AND_APPROVE', {
                    title: editTitle,
                    course_code: editCourseCode,
                    deadline: editDeadline,
                  })
                }
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Save & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
