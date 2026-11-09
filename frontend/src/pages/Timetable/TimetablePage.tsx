import React, { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Sliders,
  Plus,
  Trash2,
  X,
  Info,
  Edit3,
  Download,
  Printer,
  FileSpreadsheet,
  BookOpen,
  GraduationCap,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api';
import { CalendarEventItem, AvailabilityRuleItem, OverloadReport } from '../../types';

const SEMESTER_OPTIONS = [
  { label: '1 Week (Preview)', weeks: 1 },
  { label: '4 Weeks (1 Month)', weeks: 4 },
  { label: '8 Weeks (2 Months)', weeks: 8 },
  { label: '16 Weeks (Full Semester)', weeks: 16 },
];

export const TimetablePage: React.FC = () => {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [overloadReport, setOverloadReport] = useState<OverloadReport | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Semester picker
  const [selectedWeeks, setSelectedWeeks] = useState(16);
  const [showSemesterMenu, setShowSemesterMenu] = useState(false);
  const semesterMenuRef = useRef<HTMLDivElement>(null);

  // Export panel
  const [showExportPanel, setShowExportPanel] = useState(false);
  const exportPanelRef = useRef<HTMLDivElement>(null);

  // Modals & Drawers
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [showAvailabilityDrawer, setShowAvailabilityDrawer] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventStart, setEditEventStart] = useState('');
  const [editEventEnd, setEditEventEnd] = useState('');

  // Availability form
  const [newDayOfWeek, setNewDayOfWeek] = useState(1);
  const [newStartTime, setNewStartTime] = useState('08:30');
  const [newEndTime, setNewEndTime] = useState('12:30');

  // New event form
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<'academic' | 'skill' | 'career' | 'personal'>('academic');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [newEventLocked, setNewEventLocked] = useState(false);

  // Outside-click close for dropdowns
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (semesterMenuRef.current && !semesterMenuRef.current.contains(e.target as Node)) {
      setShowSemesterMenu(false);
    }
    if (exportPanelRef.current && !exportPanelRef.current.contains(e.target as Node)) {
      setShowExportPanel(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleOutsideClick]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [evRes, avRes] = await Promise.all([
        api.getCalendarEvents(),
        api.getAvailability(),
      ]);
      setEvents(evRes.events);
      setAvailabilityRules(avRes.rules);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleGenerateSemester = async () => {
    setGenerating(true);
    setActionNotice(null);
    try {
      const res = await api.generateWeeklySchedule(undefined, true, selectedWeeks);
      setEvents(res.events);
      if (res.overload_report) setOverloadReport(res.overload_report);
      const label = SEMESTER_OPTIONS.find(o => o.weeks === selectedWeeks)?.label ?? `${selectedWeeks} weeks`;
      setActionNotice(`✓ Timetable generated for ${label} — ${res.events.length} sessions scheduled across all your SODeL units & skill tracks.`);
      setTimeout(() => setActionNotice(null), 7000);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRescheduleToday = async () => {
    setRescheduling(true);
    setActionNotice(null);
    try {
      const res = await api.rescheduleToday();
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 6000);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRescheduling(false);
    }
  };

  const handleEventClick = (info: any) => {
    const eventId = Number(info.event.id);
    const found = events.find((e) => e.id === eventId);
    if (found) {
      setSelectedEvent(found);
      setIsEditingEvent(false);
      setEditEventTitle(found.title);
      setEditEventStart(found.start_time.slice(0, 16));
      setEditEventEnd(found.end_time.slice(0, 16));
    }
  };

  const handleSaveEventEdit = async () => {
    if (!selectedEvent || !editEventTitle.trim()) return;
    try {
      await api.updateCalendarEvent(selectedEvent.id, {
        title: editEventTitle.trim(),
        start_time: editEventStart,
        end_time: editEventEnd,
        is_locked: true,
      });
      setSelectedEvent({ ...selectedEvent, title: editEventTitle.trim(), start_time: editEventStart, end_time: editEventEnd, is_locked: true });
      setIsEditingEvent(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear ALL unlocked sessions? Locked sessions (🔒) will be preserved.')) return;
    try {
      const res = await api.clearCalendarEvents();
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEventDrop = async (info: any) => {
    const eventId = Number(info.event.id);
    const startStr = info.event.start?.toISOString();
    const endStr = info.event.end?.toISOString();
    if (!startStr || !endStr) return;
    try {
      await api.updateCalendarEvent(eventId, { start_time: startStr, end_time: endStr, is_locked: true });
      loadData();
    } catch (err: any) {
      alert(err.message);
      info.revert();
    }
  };

  const handleToggleLock = async (event: CalendarEventItem) => {
    try {
      await api.updateCalendarEvent(event.id, { is_locked: !event.is_locked });
      setSelectedEvent({ ...event, is_locked: !event.is_locked });
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleToggleComplete = async (event: CalendarEventItem) => {
    try {
      await api.updateCalendarEvent(event.id, { is_completed: !event.is_completed });
      setSelectedEvent({ ...event, is_completed: !event.is_completed });
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Delete this scheduled session?')) return;
    try {
      await api.deleteCalendarEvent(id);
      setSelectedEvent(null);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addAvailability({ day_of_week: Number(newDayOfWeek), start_time: newStartTime, end_time: newEndTime });
      const res = await api.getAvailability();
      setAvailabilityRules(res.rules);
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteAvailability = async (id: number) => {
    try {
      await api.deleteAvailability(id);
      const res = await api.getAvailability();
      setAvailabilityRules(res.rules);
    } catch (err: any) { alert(err.message); }
  };

  const handleCreateCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventStart || !newEventEnd) return;
    try {
      await api.createCalendarEvent({ title: newEventTitle, category: newEventCategory, start_time: newEventStart, end_time: newEventEnd, is_locked: newEventLocked });
      setShowNewEventModal(false);
      setNewEventTitle(''); setNewEventStart(''); setNewEventEnd('');
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  // ── Download helpers ──
  const handleDownloadICS = () => {
    if (events.length === 0) { alert('Generate a timetable first!'); return; }
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const fmt = (dtStr: string) => {
      const d = new Date(dtStr);
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    };
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MyLife OS//Semester Timetable//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:MyLife OS Semester','X-WR-TIMEZONE:Africa/Nairobi'];
    events.forEach(ev => {
      lines.push('BEGIN:VEVENT',`UID:mlos-${ev.id}@mylifeos.app`,`DTSTAMP:${fmt(new Date().toISOString())}`,`DTSTART:${fmt(ev.start_time)}`,`DTEND:${fmt(ev.end_time)}`,`SUMMARY:${ev.title.replace(/[,;]/g,' ')}`,`DESCRIPTION:${(ev.explanation||ev.category).replace(/[,;]/g,' ')}`,`CATEGORIES:${(ev.category||'STUDY').toUpperCase()}`,'STATUS:CONFIRMED','END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `MyLifeOS_Semester_${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setShowExportPanel(false);
    setActionNotice('✓ .ics downloaded — import into Google Calendar, Apple Calendar or Outlook.');
    setTimeout(() => setActionNotice(null), 6000);
  };

  const handleDownloadCSV = () => {
    if (events.length === 0) { alert('Generate a timetable first!'); return; }
    const headers = ['Day','Date','Start','End','Duration(mins)','Title','Category','Locked','Completed','Notes'];
    const rows = events.map(e => {
      const d = new Date(e.start_time);
      return [
        `"${d.toLocaleDateString('en-KE',{weekday:'long'})}"`,
        `"${d.toLocaleDateString('en-KE',{year:'numeric',month:'short',day:'numeric'})}"`,
        `"${d.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}"`,
        `"${new Date(e.end_time).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}"`,
        Math.round((new Date(e.end_time).getTime()-d.getTime())/60000),
        `"${e.title.replace(/"/g,'""')}"`,
        `"${e.category}"`,
        e.is_locked?'Yes':'No',
        e.is_completed?'Yes':'No',
        `"${(e.explanation||'').replace(/"/g,'""')}"`,
      ].join(',');
    });
    const blob = new Blob([[headers.join(','),...rows].join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`MyLifeOS_Semester_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setShowExportPanel(false);
    setActionNotice('✓ Spreadsheet downloaded — open in Excel or Google Sheets.');
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handlePrint = () => { setShowExportPanel(false); window.print(); };

  // ── Calendar event colours ──
  const calendarEvents = events.map((e) => {
    let bg = '#4f46e5', border = '#6366f1';
    if (e.category === 'skill')   { bg = '#059669'; border = '#10b981'; }
    else if (e.category === 'career') { bg = '#7c3aed'; border = '#8b5cf6'; }
    else if (e.category === 'personal' || e.category === 'rest') { bg = '#d97706'; border = '#f59e0b'; }
    if (e.is_completed) { bg = '#1e293b'; border = '#334155'; }
    return {
      id: e.id.toString(),
      title: `${e.is_locked ? '🔒 ' : ''}${e.title}`,
      start: e.start_time, end: e.end_time,
      backgroundColor: bg, borderColor: border, textColor: '#f8fafc',
      classNames: e.is_completed ? ['opacity-50'] : [],
    };
  });

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const totalHours = events.reduce((a,ev)=>a+(new Date(ev.end_time).getTime()-new Date(ev.start_time).getTime())/3600000,0);
  const academicCount = events.filter(e=>e.category==='academic').length;
  const skillsCount   = events.filter(e=>e.category==='skill').length;
  const completedCount= events.filter(e=>e.is_completed).length;

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ══ HEADER ══ */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-3 border-b border-slate-800 no-print">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Semester Timetable</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI-Balanced · Spaced Repetition
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            All 8 SODeL units · 4 technical skill tracks · Career sessions · Repeating weekly pattern
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          {/* Reschedule Today */}
          <button onClick={handleRescheduleToday} disabled={rescheduling}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${rescheduling?'animate-spin':''}`} />
            {rescheduling ? 'Optimizing…' : 'Reschedule Today'}
          </button>

          {/* ── Semester picker + Generate (combined control) ── */}
          <div className="flex items-stretch rounded-xl overflow-hidden border border-brand-500/40 shadow-md shadow-brand-500/10">
            {/* Duration dropdown */}
            <div className="relative" ref={semesterMenuRef}>
              <button onClick={() => setShowSemesterMenu(v=>!v)}
                className="h-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-brand-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-r border-brand-500/30 transition-colors whitespace-nowrap">
                <CalendarIcon className="w-3.5 h-3.5" />
                {SEMESTER_OPTIONS.find(o=>o.weeks===selectedWeeks)?.label ?? `${selectedWeeks}w`}
                <ChevronDown className={`w-3 h-3 transition-transform ${showSemesterMenu?'rotate-180':''}`} />
              </button>
              {showSemesterMenu && (
                <div className="absolute left-0 top-full mt-1 w-52 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 py-1">
                  {SEMESTER_OPTIONS.map(opt => (
                    <button key={opt.weeks} onClick={()=>{ setSelectedWeeks(opt.weeks); setShowSemesterMenu(false); }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${selectedWeeks===opt.weeks?'text-brand-400 font-bold':'text-slate-300'}`}>
                      <span>{opt.label}</span>
                      {selectedWeeks===opt.weeks && <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Generate button */}
            <button onClick={handleGenerateSemester} disabled={generating}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors whitespace-nowrap">
              <Sparkles className={`w-3.5 h-3.5 ${generating?'animate-spin':''}`} />
              {generating ? 'Generating…' : 'Generate Timetable'}
            </button>
          </div>

          {/* ── Export panel ── */}
          <div className="relative" ref={exportPanelRef}>
            <button onClick={()=>setShowExportPanel(v=>!v)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
              <Download className="w-3.5 h-3.5 text-brand-400" />
              Export
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showExportPanel?'rotate-180':''}`} />
            </button>

            {showExportPanel && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-slate-950 border border-slate-700/80 shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">Export Timetable</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{events.length} sessions ready</p>
                  </div>
                  <button onClick={()=>setShowExportPanel(false)} className="text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  <button onClick={handleDownloadICS}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/25 transition-colors">
                      <CalendarIcon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-xs font-semibold text-slate-100 block">iCalendar (.ics)</span>
                      <span className="text-[10px] text-slate-400 leading-snug block">Import into Google Calendar, Apple Calendar, Outlook or your phone</span>
                    </div>
                  </button>

                  <button onClick={handleDownloadCSV}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-xs font-semibold text-slate-100 block">Spreadsheet (.csv)</span>
                      <span className="text-[10px] text-slate-400 leading-snug block">Day · Date · Time · Duration — open in Excel or Google Sheets</span>
                    </div>
                  </button>

                  <button onClick={handlePrint}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0 group-hover:bg-sky-500/25 transition-colors">
                      <Printer className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-xs font-semibold text-slate-100 block">Print / Save as PDF</span>
                      <span className="text-[10px] text-slate-400 leading-snug block">Sidebar &amp; buttons hidden automatically for a clean printout</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clear */}
          <button onClick={handleClearAll}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>

          {/* Add Event */}
          <button onClick={()=>setShowNewEventModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>

          {/* Availability */}
          <button onClick={()=>setShowAvailabilityDrawer(v=>!v)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer">
            <Sliders className="w-3.5 h-3.5" /> Availability
          </button>
        </div>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 no-print">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        {[
          { icon: <span className="font-bold text-sm">{events.length}</span>, color:'brand', label:'Total Sessions', sub:`${Math.round(totalHours*10)/10}h planned` },
          { icon: <GraduationCap className="w-5 h-5"/>, color:'indigo', label:'SODeL Study', sub:`${academicCount} study blocks` },
          { icon: <BookOpen className="w-5 h-5"/>, color:'emerald', label:'Technical Skills', sub:`${skillsCount} lab blocks` },
          { icon: <span className="font-bold text-xs">{events.length>0?Math.round((completedCount/events.length)*100):0}%</span>, color:'amber', label:'Progress', sub:`${completedCount}/${events.length} done` },
        ].map((s,i)=>(
          <div key={i} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-500/10 border border-${s.color}-500/20 text-${s.color}-400 flex items-center justify-center shrink-0`}>
              {s.icon}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">{s.label}</span>
              <span className="text-sm font-bold text-slate-100">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-slate-900/70 border border-slate-800 rounded-xl no-print">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"/>SODeL Units</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/>Technical Skills</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"/>Career &amp; Jobs</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"/>Personal / Rest</span>
          <span className="flex items-center gap-1.5"><Lock className="w-3 h-3"/>Locked</span>
        </div>
        <span className="text-[11px] text-slate-500 italic">Click any block → view · edit · lock · mark complete · drag to reschedule</span>
      </div>

      {/* Overload Warning */}
      {overloadReport?.is_overloaded && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5"/>
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider block">Schedule Overload Warning</span>
            <p className="text-slate-300">Demand ({overloadReport.total_needed_hours}h) exceeds availability ({overloadReport.total_available_hours}h) by <strong>{overloadReport.deficit_hours}h</strong>.</p>
            <p className="text-amber-300 italic">{overloadReport.suggestion}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-700 rounded-3xl bg-slate-900/30">
          <CalendarIcon className="w-14 h-14 text-slate-700 mb-4"/>
          <h3 className="text-slate-300 font-semibold text-lg mb-1">No semester timetable yet</h3>
          <p className="text-slate-500 text-sm mb-5 max-w-md">Pick a duration from the dropdown and click <span className="font-semibold text-slate-300">Generate Timetable</span>. The engine will schedule all your SODeL units, skill tracks and career sessions across every day of the semester.</p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
            {['8 SODeL Units','4 Skill Tracks','Career Sessions','Spaced Repetition','No Same-Day Repeats'].map(t=>(
              <span key={t} className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── FullCalendar ── */}
      {(loading || events.length > 0) && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-xs text-slate-500 border-b border-slate-800/60 no-print">
            <Info className="w-3.5 h-3.5 text-slate-600 shrink-0"/>
            <span>Use <strong className="text-slate-400">Day / Week / Month</strong> buttons or the <strong className="text-slate-400">← →</strong> arrows to navigate through your full semester. Each day shows the actual date and weekday name.</span>
          </div>
          <div className="p-4 sm:p-5">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'timeGridDay,timeGridWeek,dayGridMonth',
              }}
              buttonText={{ today:'Today', day:'Day', week:'Week', month:'Month' }}
              dayHeaderFormat={{ weekday:'long', month:'short', day:'numeric', omitCommas:true }}
              titleFormat={{ year:'numeric', month:'long' }}
              editable={true}
              droppable={true}
              slotMinTime="07:00:00"
              slotMaxTime="23:00:00"
              allDaySlot={false}
              events={calendarEvents}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              height="auto"
              slotDuration="00:30:00"
              slotLabelInterval="01:00:00"
              nowIndicator={true}
              eventTimeFormat={{ hour:'2-digit', minute:'2-digit', meridiem:false }}
            />
          </div>
        </div>
      )}


      {/* ══ MODAL: Event Detail / Edit ══ */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                selectedEvent.category==='academic'?'bg-indigo-500/15 border-indigo-500/30 text-indigo-300':
                selectedEvent.category==='skill'?'bg-emerald-500/15 border-emerald-500/30 text-emerald-300':
                selectedEvent.category==='career'?'bg-purple-500/15 border-purple-500/30 text-purple-300':
                'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}>
                {selectedEvent.category} session
              </span>
              <button onClick={()=>setSelectedEvent(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4"/>
              </button>
            </div>

            {isEditingEvent ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Session Title</label>
                  <input type="text" value={editEventTitle} onChange={e=>setEditEventTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Start</label>
                    <input type="datetime-local" value={editEventStart} onChange={e=>setEditEventStart(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">End</label>
                    <input type="datetime-local" value={editEventEnd} onChange={e=>setEditEventEnd(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100"/>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveEventEdit} className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold cursor-pointer">Save Changes</button>
                  <button onClick={()=>setIsEditingEvent(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-slate-100 text-base leading-snug">{selectedEvent.title}</h3>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-500"/>
                    <span>{new Date(selectedEvent.start_time).toLocaleDateString([],{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500"/>
                    <span>{new Date(selectedEvent.start_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} – {new Date(selectedEvent.end_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                    <span className="text-slate-500">({Math.round((new Date(selectedEvent.end_time).getTime()-new Date(selectedEvent.start_time).getTime())/60000)}min)</span>
                  </div>
                </div>
                {selectedEvent.explanation && (
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-brand-400 text-xs font-semibold">
                      <Info className="w-3.5 h-3.5"/> Scheduling Engine Reason
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedEvent.explanation}</p>
                  </div>
                )}
              </>
            )}

            {!isEditingEvent && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={()=>setIsEditingEvent(true)}
                    className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer">
                    <Edit3 className="w-3.5 h-3.5"/> Edit
                  </button>
                  <button onClick={()=>handleToggleLock(selectedEvent)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${selectedEvent.is_locked?'bg-amber-500/20 border-amber-500/40 text-amber-300':'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                    {selectedEvent.is_locked?<Lock className="w-3.5 h-3.5"/>:<Unlock className="w-3.5 h-3.5"/>}
                    {selectedEvent.is_locked?'Locked':'Lock'}
                  </button>
                  <button onClick={()=>handleToggleComplete(selectedEvent)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${selectedEvent.is_completed?'bg-emerald-500/20 border-emerald-500/40 text-emerald-300':'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5"/>
                    {selectedEvent.is_completed?'Completed':'Mark Done'}
                  </button>
                </div>
                <button onClick={()=>handleDeleteEvent(selectedEvent.id)}
                  className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 cursor-pointer" title="Delete session">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ══ DRAWER: Availability ══ */}
      {showAvailabilityDrawer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-400"/>
                <h3 className="font-bold text-slate-100 text-base">Weekly Availability Rules</h3>
              </div>
              <button onClick={()=>setShowAvailabilityDrawer(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <p className="text-xs text-slate-400">Define your study windows for each day of the week. The scheduler will only place sessions within these hours. Leave empty to use defaults (09:00–13:00, 15:00–18:30).</p>

            <form onSubmit={handleAddAvailability} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Add Window</h4>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Day of Week</label>
                <select value={newDayOfWeek} onChange={e=>setNewDayOfWeek(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100">
                  {dayNames.map((name,idx)=><option key={idx} value={idx}>{name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Start Time</label>
                  <input type="time" value={newStartTime} onChange={e=>setNewStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"/>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">End Time</label>
                  <input type="time" value={newEndTime} onChange={e=>setNewEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"/>
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold cursor-pointer">
                Save Availability Slot
              </button>
            </form>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Configured Windows</h4>
              {availabilityRules.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Using defaults (09:00–13:00, 15:00–18:30). Add custom windows above.</p>
              ) : (
                availabilityRules.map(rule=>(
                  <div key={rule.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-200 block">{dayNames[rule.day_of_week]}</span>
                      <span className="text-slate-400">{rule.start_time} – {rule.end_time}</span>
                    </div>
                    <button onClick={()=>handleDeleteAvailability(rule.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}


      {/* ══ MODAL: Custom Event ══ */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Add Calendar Event</h3>
            <form onSubmit={handleCreateCustomEvent} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Title</label>
                <input required type="text" placeholder="e.g. Fixed Lab Lecture / Group Meeting"
                  value={newEventTitle} onChange={e=>setNewEventTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"/>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Category</label>
                <select value={newEventCategory} onChange={e=>setNewEventCategory(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100">
                  <option value="academic">Academic Study</option>
                  <option value="skill">Technical Skill</option>
                  <option value="career">Career / Job</option>
                  <option value="personal">Personal / Rest</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Start</label>
                  <input required type="datetime-local" value={newEventStart} onChange={e=>setNewEventStart(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"/>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">End</label>
                  <input required type="datetime-local" value={newEventEnd} onChange={e=>setNewEventEnd(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"/>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="lock-new" checked={newEventLocked} onChange={e=>setNewEventLocked(e.target.checked)}
                  className="rounded text-brand-600"/>
                <label htmlFor="lock-new" className="text-xs text-slate-300">Lock session (preserve from auto-rescheduling)</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowNewEventModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold cursor-pointer">Cancel</button>
                <button type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold cursor-pointer">Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
