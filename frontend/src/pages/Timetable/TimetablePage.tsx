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
  Layers,
  Edit3,
  Download,
  Printer,
  FileSpreadsheet,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import { api } from '../../services/api';
import { CalendarEventItem, AvailabilityRuleItem, OverloadReport } from '../../types';

export const TimetablePage: React.FC = () => {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [overloadReport, setOverloadReport] = useState<OverloadReport | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [showAvailabilityDrawer, setShowAvailabilityDrawer] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Close download menu when clicking outside
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
      setShowDownloadMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDownloadMenu, handleOutsideClick]);

  // New rule state
  const [newDayOfWeek, setNewDayOfWeek] = useState(1);
  const [newStartTime, setNewStartTime] = useState('08:30');
  const [newEndTime, setNewEndTime] = useState('12:30');

  // New custom event state
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<'academic' | 'skill' | 'career' | 'personal'>('academic');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [newEventLocked, setNewEventLocked] = useState(false);

  // Edit existing event state
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventStart, setEditEventStart] = useState('');
  const [editEventEnd, setEditEventEnd] = useState('');

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

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateWeekly = async () => {
    setGenerating(true);
    setActionNotice(null);
    try {
      const res = await api.generateWeeklySchedule(undefined, true);
      setEvents(res.events);
      if (res.overload_report) {
        setOverloadReport(res.overload_report);
      }
      setActionNotice('New weekly timetable generated successfully with deterministic priority ranking.');
      setTimeout(() => setActionNotice(null), 5000);
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
      setSelectedEvent({
        ...selectedEvent,
        title: editEventTitle.trim(),
        start_time: editEventStart,
        end_time: editEventEnd,
        is_locked: true,
      });
      setIsEditingEvent(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleClearWeek = async () => {
    if (!confirm('Clear all unlocked sessions for this week? Any locked sessions (🔒) will remain safely intact.')) return;
    try {
      const res = await api.clearCalendarEvents();
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownloadICS = () => {
    if (events.length === 0) {
      alert('No timetable sessions found to export. Generate your schedule first!');
      return;
    }
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const formatICSDate = (dtStr: string) => {
      const d = new Date(dtStr);
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    };

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MyLife OS//Adaptive Timetable//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:MyLife OS Timetable',
      'X-WR-TIMEZONE:Africa/Nairobi',
    ];

    events.forEach((ev) => {
      const dtStart = formatICSDate(ev.start_time);
      const dtEnd = formatICSDate(ev.end_time);
      const summary = ev.title.replace(/[,;]/g, ' ');
      const desc = (ev.explanation || `Category: ${ev.category}`).replace(/[,;]/g, ' ');
      const uid = `mylife-session-${ev.id}-${Date.now()}@mylifeos.app`;

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        `CATEGORIES:${ev.category ? ev.category.toUpperCase() : 'STUDY'}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsLines.push('END:VCALENDAR');

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MyLife_OS_Timetable_${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
    setActionNotice('Downloaded .ics file! You can import it directly into Google Calendar, Apple Calendar, or Outlook.');
    setTimeout(() => setActionNotice(null), 6000);
  };

  const handleDownloadCSV = () => {
    if (events.length === 0) {
      alert('No timetable sessions found to export. Generate your schedule first!');
      return;
    }
    const headers = ['Day', 'Date', 'Start Time', 'End Time', 'Duration (mins)', 'Session Title', 'Category', 'Locked', 'Completed', 'Details'];
    const rows = events.map((e) => {
      const d = new Date(e.start_time);
      const day = d.toLocaleDateString('en-KE', { weekday: 'long' });
      const dateStr = d.toLocaleDateString('en-KE');
      const start = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(e.end_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
      const dur = Math.round((new Date(e.end_time).getTime() - d.getTime()) / 60000);
      return [
        `"${day}"`,
        `"${dateStr}"`,
        `"${start}"`,
        `"${end}"`,
        dur,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${e.category}"`,
        e.is_locked ? 'Yes' : 'No',
        e.is_completed ? 'Yes' : 'No',
        `"${(e.explanation || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MyLife_OS_Timetable_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
    setActionNotice('Downloaded spreadsheet CSV file!');
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handlePrintTimetable = () => {
    setShowDownloadMenu(false);
    window.print();
  };

  const handleEventDrop = async (info: any) => {
    const eventId = Number(info.event.id);
    const startStr = info.event.start?.toISOString();
    const endStr = info.event.end?.toISOString();

    if (!startStr || !endStr) return;

    try {
      await api.updateCalendarEvent(eventId, {
        start_time: startStr,
        end_time: endStr,
        is_locked: true, // Manually dropped events become locked
      });
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
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleComplete = async (event: CalendarEventItem) => {
    try {
      await api.updateCalendarEvent(event.id, { is_completed: !event.is_completed });
      setSelectedEvent({ ...event, is_completed: !event.is_completed });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Delete this scheduled session?')) return;
    try {
      await api.deleteCalendarEvent(id);
      setSelectedEvent(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addAvailability({
        day_of_week: Number(newDayOfWeek),
        start_time: newStartTime,
        end_time: newEndTime,
      });
      const res = await api.getAvailability();
      setAvailabilityRules(res.rules);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAvailability = async (id: number) => {
    try {
      await api.deleteAvailability(id);
      const res = await api.getAvailability();
      setAvailabilityRules(res.rules);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventStart || !newEventEnd) return;
    try {
      await api.createCalendarEvent({
        title: newEventTitle,
        category: newEventCategory,
        start_time: newEventStart,
        end_time: newEventEnd,
        is_locked: newEventLocked,
      });
      setShowNewEventModal(false);
      setNewEventTitle('');
      setNewEventStart('');
      setNewEventEnd('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Format events for FullCalendar
  const calendarEvents = events.map((e) => {
    let bg = '#4f46e5'; // Academic
    let border = '#6366f1';
    if (e.category === 'skill') {
      bg = '#059669'; // Emerald
      border = '#10b981';
    } else if (e.category === 'career') {
      bg = '#7c3aed'; // Purple
      border = '#8b5cf6';
    } else if (e.category === 'personal' || e.category === 'rest') {
      bg = '#d97706'; // Amber
      border = '#f59e0b';
    }

    if (e.is_completed) {
      bg = '#1e293b';
      border = '#334155';
    }

    return {
      id: e.id.toString(),
      title: `${e.is_locked ? '🔒 ' : ''}${e.title}`,
      start: e.start_time,
      end: e.end_time,
      backgroundColor: bg,
      borderColor: border,
      textColor: '#f8fafc',
      classNames: e.is_completed ? ['line-through', 'opacity-60'] : [],
    };
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const totalHours = events.reduce((acc, ev) => {
    const dur = (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 3600000;
    return acc + dur;
  }, 0);

  const academicCount = events.filter((e) => e.category === 'academic').length;
  const skillsCount = events.filter((e) => e.category === 'skill').length;
  const careerCount = events.filter((e) => e.category === 'career').length;
  const completedCount = events.filter((e) => e.is_completed).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Main Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Adaptive Timetable</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Balanced Floor & Interleaved Engine</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Equal baseline study &bull; Spaced repetition &bull; Zero overlaps &bull; Protected personal time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reschedule My Day Prominent Button */}
          <button
            onClick={handleRescheduleToday}
            disabled={rescheduling}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer transition-all"
            title="Re-pack unfinished sessions for today into remaining open slots"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rescheduling ? 'animate-spin' : ''}`} />
            <span>{rescheduling ? 'Optimizing...' : 'Reschedule My Day'}</span>
          </button>

          {/* Generate Schedule Button */}
          <button
            onClick={handleGenerateWeekly}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-brand-500/20 disabled:opacity-50 cursor-pointer transition-all"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Calculating Schedule...' : 'Generate Week Timetable'}</span>
          </button>

          {/* Download Timetable Dropdown */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              title="Download timetable for calendar apps, spreadsheet, or PDF"
            >
              <Download className="w-3.5 h-3.5 text-brand-400" />
              <span>Download</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 space-y-1 animate-fadeIn">
                <button
                  onClick={handleDownloadICS}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-100 block">iCalendar (.ics)</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">Syncs directly with Google Calendar, Apple Calendar, Outlook & Phone</span>
                  </div>
                </button>

                <button
                  onClick={handleDownloadCSV}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-100 block">Spreadsheet (.csv)</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">Tabular export for Excel, Google Sheets or Notion</span>
                  </div>
                </button>

                <button
                  onClick={handlePrintTimetable}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-100 block">Print / Save as PDF</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">Formatted printable study schedule sheet</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Clear Week Button */}
          <button
            onClick={handleClearWeek}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            title="Clear all flexible sessions and start with a clean slate"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Week</span>
          </button>

          {/* Custom Event */}
          <button
            onClick={() => setShowNewEventModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>

          {/* Availability Settings Drawer Toggle */}
          <button
            onClick={() => setShowAvailabilityDrawer(!showAvailabilityDrawer)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Availability</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn no-print">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Weekly Schedule Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm shrink-0">
            {events.length}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Weekly Sessions</span>
            <span className="text-sm font-bold text-slate-100">{Math.round(totalHours * 10) / 10}h scheduled</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">SODeL Units</span>
            <span className="text-sm font-bold text-slate-100">{academicCount} Study Blocks</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Technical Tracks</span>
            <span className="text-sm font-bold text-slate-100">{skillsCount} Lab Blocks</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
            {completedCount}/{events.length}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Weekly Progress</span>
            <span className="text-sm font-bold text-slate-100">
              {events.length > 0 ? Math.round((completedCount / events.length) * 100) : 0}% Completed
            </span>
          </div>
        </div>
      </div>

      {/* Category Legend & Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 no-print px-1 py-1 bg-slate-900/60 border border-slate-800/80 rounded-xl">
        <div className="flex flex-wrap items-center gap-4 px-2">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> SODeL Units</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Technical Skills</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Career & Jobs</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Assignments & Prep</span>
          <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-slate-400" /> Locked Session</span>
        </div>
        <span className="text-[11px] text-slate-500 px-2">Click any session to view explanation, edit times, lock slot, or mark complete.</span>
      </div>

      {/* Overload Alert Banner */}
      {overloadReport?.is_overloaded && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider block">Overload Warning Detected</span>
            <p className="text-slate-300">
              Total workload demand ({overloadReport.total_needed_hours}h) exceeds your configured available hours ({overloadReport.total_available_hours}h) by{' '}
              <strong>{overloadReport.deficit_hours}h</strong>.
            </p>
            <p className="text-amber-300 italic">{overloadReport.suggestion}</p>
          </div>
        </div>
      )}

      {/* FullCalendar Interactive Workspace */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth',
          }}
          editable={true}
          droppable={true}
          slotMinTime="07:00:00"
          slotMaxTime="23:00:00"
          allDaySlot={false}
          events={calendarEvents}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          height="auto"
        />
      </div>

      {/* MODAL: Event Inspection & Explanation */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">
                {selectedEvent.category} session
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isEditingEvent ? (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Session Title</label>
                  <input
                    type="text"
                    value={editEventTitle}
                    onChange={(e) => setEditEventTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={editEventStart}
                      onChange={(e) => setEditEventStart(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={editEventEnd}
                      onChange={(e) => setEditEventEnd(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveEventEdit}
                    className="flex-1 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditingEvent(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-slate-100 text-base">{selectedEvent.title}</h3>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>
                      {new Date(selectedEvent.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(selectedEvent.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-slate-500" />
                    <span>{new Date(selectedEvent.start_time).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>

                {/* Decision Explanation */}
                {selectedEvent.explanation && (
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-brand-400 text-xs font-semibold">
                      <Info className="w-3.5 h-3.5" />
                      <span>Scheduling Engine Decision</span>
                    </div>
                    <p className="text-xs text-slate-300">{selectedEvent.explanation}</p>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingEvent(!isEditingEvent)}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingEvent ? 'Cancel Edit' : 'Edit'}</span>
                </button>

                <button
                  onClick={() => handleToggleLock(selectedEvent)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    selectedEvent.is_locked
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {selectedEvent.is_locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{selectedEvent.is_locked ? 'Locked' : 'Lock Event'}</span>
                </button>

                <button
                  onClick={() => handleToggleComplete(selectedEvent)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    selectedEvent.is_completed
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selectedEvent.is_completed ? 'Completed' : 'Mark Done'}</span>
                </button>
              </div>

              <button
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                title="Delete event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: Availability Management */}
      {showAvailabilityDrawer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-slate-100 text-base">Weekly Availability Rules</h3>
              </div>
              <button
                onClick={() => setShowAvailabilityDrawer(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Define your flexible study and working intervals for each day. The scheduling engine will never place sessions outside these ranges.
            </p>

            {/* Add Rule Form */}
            <form onSubmit={handleAddAvailability} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Add Availability Window</h4>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Day of Week</label>
                <select
                  value={newDayOfWeek}
                  onChange={(e) => setNewDayOfWeek(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                >
                  {dayNames.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold"
              >
                Save Availability Slot
              </button>
            </form>

            {/* Existing Rules List */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Configured Windows</h4>
              {availabilityRules.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Using default schedule windows (09:00 - 13:00, 15:00 - 18:30). Add custom windows above to personalize.
                </p>
              ) : (
                availabilityRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block">{dayNames[rule.day_of_week]}</span>
                      <span className="text-slate-400">{rule.start_time} - {rule.end_time}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteAvailability(rule.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Custom Event */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Add Calendar Event</h3>
            <form onSubmit={handleCreateCustomEvent} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Fixed Lab Lecture / Group Meeting"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Category</label>
                <select
                  value={newEventCategory}
                  onChange={(e) => setNewEventCategory(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  <option value="academic">Academic Study</option>
                  <option value="skill">Technical Skill</option>
                  <option value="career">Career / Job</option>
                  <option value="personal">Personal / Rest</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Start Time</label>
                  <input
                    required
                    type="datetime-local"
                    value={newEventStart}
                    onChange={(e) => setNewEventStart(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">End Time</label>
                  <input
                    required
                    type="datetime-local"
                    value={newEventEnd}
                    onChange={(e) => setNewEventEnd(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="lock-event-check"
                  checked={newEventLocked}
                  onChange={(e) => setNewEventLocked(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="lock-event-check" className="text-xs text-slate-300">
                  Lock session (preserve from automatic rescheduling)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
