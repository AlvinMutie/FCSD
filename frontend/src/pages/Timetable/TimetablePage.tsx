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
  FileCode,
  BookOpen,
  GraduationCap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { api } from '../../services/api';
import { CalendarEventItem, AvailabilityRuleItem, OverloadReport, AcademicTerm } from '../../types';
import { SemesterSetupModal } from '../../components/SemesterSetupModal';

// ── Date formatting helpers ──────────────────────────────────────
const fmtDate = (d: Date | string) => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return dateObj.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Colour palette per category ──────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; border: string; pill: string; text: string }> = {
  academic: { bg: '#4338ca', border: '#6366f1', pill: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300', text: 'text-indigo-300' },
  skill:    { bg: '#059669', border: '#10b981', pill: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300', text: 'text-emerald-300' },
  career:   { bg: '#7c3aed', border: '#8b5cf6', pill: 'bg-purple-500/15 border-purple-500/30 text-purple-300', text: 'text-purple-300' },
  personal: { bg: '#d97706', border: '#f59e0b', pill: 'bg-amber-500/15 border-amber-500/30 text-amber-300', text: 'text-amber-300' },
  rest:     { bg: '#d97706', border: '#f59e0b', pill: 'bg-amber-500/15 border-amber-500/30 text-amber-300', text: 'text-amber-300' },
};

// ── Printable timetable HTML builder ────────────────────────────
function buildPrintableHTML(events: CalendarEventItem[], term?: AcademicTerm | null): string {
  if (!events.length) return '';

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 → 21:00

  // Group events by ISO week → day-of-week (0=Mon)
  const byWeek: Record<string, Record<number, CalendarEventItem[]>> = {};
  events.forEach(ev => {
    const d = new Date(ev.start_time);
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const key = `${d.getFullYear()}-W${String(weekNo).padStart(2,'0')}`;
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0=Mon
    if (!byWeek[key]) byWeek[key] = {};
    if (!byWeek[key][dow]) byWeek[key][dow] = [];
    byWeek[key][dow].push(ev);
  });

  const catColor: Record<string,string> = {
    academic:'#4338ca', skill:'#059669', career:'#7c3aed', personal:'#d97706', rest:'#d97706',
  };

  const weekSections = Object.entries(byWeek).sort(([a],[b])=>a.localeCompare(b)).map(([wk, dayMap]) => {
    const allInWeek = Object.values(dayMap).flat();
    const dates = allInWeek.map(e => new Date(e.start_time));
    const minDate = new Date(Math.min(...dates.map(d=>d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d=>d.getTime())));
    const weekLabel = `${minDate.toLocaleDateString('en-KE',{day:'numeric',month:'short'})} – ${maxDate.toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}`;

    const colDates: (Date|null)[] = Array(7).fill(null);
    Object.entries(dayMap).forEach(([dow, evs]) => {
      colDates[Number(dow)] = new Date(evs[0].start_time);
    });

    const rows = HOURS.map(h => {
      const cells = DAYS.map((_, di) => {
        const dayEvs = (dayMap[di] || []).filter(ev => {
          const start = new Date(ev.start_time).getHours();
          return start === h;
        });
        if (!dayEvs.length) return `<td style="border:1px solid #e2e8f0;padding:4px;vertical-align:top;min-height:38px;height:38px;"></td>`;
        const inner = dayEvs.map(ev => {
          const st = new Date(ev.start_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
          const et = new Date(ev.end_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
          const color = catColor[ev.category] || '#4338ca';
          const shortTitle = ev.title.replace(/^(Study: |Study & Practice: |Deep Revision: |Technical Skill Track: |Technical Skill Lab: |Career Activity: )/,'');
          return `<div style="background:${color};color:#fff;border-radius:4px;padding:3px 5px;margin-bottom:2px;font-size:9px;line-height:1.3;">
            <strong>${shortTitle}</strong><br/><span style="opacity:.85">${st}–${et}</span>
          </div>`;
        }).join('');
        return `<td style="border:1px solid #e2e8f0;padding:3px;vertical-align:top;min-height:38px;">${inner}</td>`;
      });
      return `<tr>
        <td style="border:1px solid #e2e8f0;padding:4px 6px;text-align:center;font-size:10px;color:#64748b;white-space:nowrap;font-weight:600;">${String(h).padStart(2,'0')}:00</td>
        ${cells.join('')}
      </tr>`;
    });

    const headers = DAYS.map((day, i) => {
      const d = colDates[i];
      const dateStr = d ? d.toLocaleDateString('en-KE',{day:'numeric',month:'short'}) : '';
      return `<th style="border:1px solid #cbd5e1;padding:6px 4px;background:#f8fafc;font-size:11px;text-align:center;min-width:95px;">
        <div style="font-weight:700;color:#1e293b;">${day}</div>
        ${dateStr ? `<div style="font-size:9px;color:#64748b;margin-top:1px;">${dateStr}</div>` : ''}
      </th>`;
    }).join('');

    return `
      <div style="margin-bottom:32px;page-break-inside:avoid;">
        <div style="background:#1e293b;color:#fff;padding:8px 12px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;font-size:13px;">${wk.replace('-W',' Week ')}</span>
          <span style="font-size:11px;opacity:.85;">${weekLabel}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;">
          <thead>
            <tr>
              <th style="border:1px solid #cbd5e1;padding:6px;background:#f1f5f9;font-size:10px;color:#64748b;width:50px;">Time</th>
              ${headers}
            </tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>`;
  }).join('');

  const legend = Object.entries(catColor).map(([cat, color]) =>
    `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px;font-size:10px;">
      <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${color};"></span>
      ${cat.charAt(0).toUpperCase()+cat.slice(1)}
    </span>`
  ).join('');

  const termLabel = term ? `${term.name} (${term.effective_start_date || term.study_start_date || term.start_date} → ${term.end_date})` : 'Semester Schedule';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>MyLife OS — Timetable ${termLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 20px; }
  @page { size: A4 landscape; margin: 12mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #1e293b;">
    <div>
      <h1 style="font-size:20px;font-weight:800;color:#1e293b;">MyLife OS — JKUAT Semester Timetable</h1>
      <p style="font-size:12px;color:#64748b;margin-top:3px;">${termLabel} · ${events.length} sessions scheduled · Zero Overlaps · Balanced Baseline</p>
    </div>
    <div style="text-align:right;font-size:10px;color:#94a3b8;">
      Generated: ${new Date().toLocaleString('en-KE')}<br/>
      Units: BIT 2214, Calculus I, Database Systems, GIS,<br/>Mobile & Wireless, OOP I, Software Eng 1, Web App Dev I
    </div>
  </div>

  <div style="margin-bottom:14px;">${legend}</div>

  ${weekSections}

  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;">
    MyLife OS Adaptive Scheduler · Equal baseline study · Spaced repetition · Protected personal time
  </div>
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════════
export const TimetablePage: React.FC = () => {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents]                       = useState<CalendarEventItem[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRuleItem[]>([]);
  const [currentTerm, setCurrentTerm]             = useState<AcademicTerm | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [generating, setGenerating]               = useState(false);
  const [rescheduling, setRescheduling]           = useState(false);
  const [overloadReport, setOverloadReport]       = useState<OverloadReport | null>(null);
  const [actionNotice, setActionNotice]           = useState<string | null>(null);

  // Active calendar view and date state
  const [activeCalendarView, setActiveCalendarView] = useState<string>('timeGridWeek');
  const [activeCalendarDate, setActiveCalendarDate] = useState<Date>(new Date());

  // Export panel
  const [showExportPanel, setShowExportPanel] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Semester setup modal
  const [showSemesterModal, setShowSemesterModal] = useState(false);

  // Modals & Drawers
  const [selectedEvent, setSelectedEvent]   = useState<CalendarEventItem | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editTitle, setEditTitle]           = useState('');
  const [editStart, setEditStart]           = useState('');
  const [editEnd, setEditEnd]               = useState('');
  const [showAvailability, setShowAvailability] = useState(false);
  const [showNewModal, setShowNewModal]         = useState(false);

  // Availability form
  const [newDow, setNewDow]     = useState(1);
  const [newSTime, setNewSTime] = useState('08:30');
  const [newETime, setNewETime] = useState('17:00');

  // New event form
  const [newTitle, setNewTitle]     = useState('');
  const [newCat, setNewCat]         = useState<'academic'|'skill'|'career'|'personal'>('academic');
  const [newEvStart, setNewEvStart] = useState('');
  const [newEvEnd, setNewEvEnd]     = useState('');
  const [newLocked, setNewLocked]   = useState(false);

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // Close export panel on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setShowExportPanel(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Data loading ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [evRes, avRes, termRes] = await Promise.all([
        api.getCalendarEvents(),
        api.getAvailability(),
        api.getCurrentTerm().catch(() => ({ term: null })),
      ]);
      setEvents(evRes.events);
      setAvailabilityRules(avRes.rules);
      if (termRes && termRes.term) setCurrentTerm(termRes.term);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate current term parameters
  const studyStartStr = currentTerm?.effective_start_date || currentTerm?.study_start_date || currentTerm?.start_date || '2026-11-09';
  const termEndStr = currentTerm?.end_date || '2026-12-31';
  const studyStart = new Date(studyStartStr);
  const termEnd = new Date(termEndStr);
  const calculatedWeeks = Math.max(1, Math.ceil((termEnd.getTime() - studyStart.getTime()) / (7 * 86400000)));

  // ── Semester generate ─────────────────────────────────────────
  const handleGenerateSemester = async () => {
    setGenerating(true);
    setActionNotice(null);
    try {
      const res = await api.generateWeeklySchedule(undefined, true, 0);
      setEvents(res.events);
      if (res.overload_report) setOverloadReport(res.overload_report);
      setActionNotice(`✓ ${res.message}`);
      setTimeout(() => setActionNotice(null), 8000);
      calendarRef.current?.getApi().today();
      loadData();
    } catch (err: any) { alert(err.message); }
    finally { setGenerating(false); }
  };

  // ── Reschedule today ──────────────────────────────────────────
  const handleRescheduleToday = async () => {
    setRescheduling(true);
    setActionNotice(null);
    try {
      const res = await api.rescheduleToday();
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 6000);
      loadData();
    } catch (err: any) { alert(err.message); }
    finally { setRescheduling(false); }
  };

  // ── Day Navigation Helpers ────────────────────────────────────
  const navigateToDate = (targetDate: Date, view: 'timeGridDay' | 'timeGridWeek' = 'timeGridDay') => {
    const apiInstance = calendarRef.current?.getApi();
    if (!apiInstance) return;
    apiInstance.changeView(view, targetDate.toISOString());
    setActiveCalendarView(view);
    setActiveCalendarDate(targetDate);
  };

  const navigatePrev = () => {
    const apiInstance = calendarRef.current?.getApi();
    if (!apiInstance) return;
    apiInstance.prev();
    setActiveCalendarDate(apiInstance.getDate());
  };

  const navigateNext = () => {
    const apiInstance = calendarRef.current?.getApi();
    if (!apiInstance) return;
    apiInstance.next();
    setActiveCalendarDate(apiInstance.getDate());
  };

  const navigateToday = () => {
    const apiInstance = calendarRef.current?.getApi();
    if (!apiInstance) return;
    apiInstance.today();
    setActiveCalendarDate(apiInstance.getDate());
  };

  // Compute 7 days of the active week for the Day Ribbon
  const getDaysOfActiveWeek = () => {
    const curr = new Date(activeCalendarDate);
    const day = curr.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Mon=1
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const activeWeekDays = getDaysOfActiveWeek();

  // ── Event click ───────────────────────────────────────────────
  const handleEventClick = (info: any) => {
    const found = events.find(e => e.id === Number(info.event.id));
    if (found) {
      setSelectedEvent(found);
      setIsEditingEvent(false);
      setEditTitle(found.title);
      setEditStart(found.start_time.slice(0, 16));
      setEditEnd(found.end_time.slice(0, 16));
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedEvent || !editTitle.trim()) return;
    try {
      await api.updateCalendarEvent(selectedEvent.id, { title: editTitle.trim(), start_time: editStart, end_time: editEnd, is_locked: true });
      setSelectedEvent({ ...selectedEvent, title: editTitle.trim(), start_time: editStart, end_time: editEnd, is_locked: true });
      setIsEditingEvent(false);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear ALL unlocked sessions? Locked sessions 🔒 are preserved.')) return;
    try {
      const res = await api.clearCalendarEvents();
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 4000);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleEventDrop = async (info: any) => {
    const startStr = info.event.start?.toISOString();
    const endStr   = info.event.end?.toISOString();
    if (!startStr || !endStr) return;
    try {
      await api.updateCalendarEvent(Number(info.event.id), { start_time: startStr, end_time: endStr, is_locked: true });
      loadData();
    } catch (err: any) { alert(err.message); info.revert(); }
  };

  const handleToggleLock = async (ev: CalendarEventItem) => {
    try {
      await api.updateCalendarEvent(ev.id, { is_locked: !ev.is_locked });
      setSelectedEvent({ ...ev, is_locked: !ev.is_locked });
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleToggleComplete = async (ev: CalendarEventItem) => {
    try {
      await api.updateCalendarEvent(ev.id, { is_completed: !ev.is_completed });
      setSelectedEvent({ ...ev, is_completed: !ev.is_completed });
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Delete this session?')) return;
    try {
      await api.deleteCalendarEvent(id);
      setSelectedEvent(null);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addAvailability({ day_of_week: Number(newDow), start_time: newSTime, end_time: newETime });
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newEvStart || !newEvEnd) return;
    try {
      await api.createCalendarEvent({ title: newTitle, category: newCat, start_time: newEvStart, end_time: newEvEnd, is_locked: newLocked });
      setShowNewModal(false);
      setNewTitle(''); setNewEvStart(''); setNewEvEnd('');
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  // ── Downloads ─────────────────────────────────────────────────
  const downloadICS = () => {
    if (!events.length) { alert('Generate a timetable first!'); return; }
    const p = (n: number) => String(n).padStart(2, '0');
    const fmt = (s: string) => { const d = new Date(s); return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00Z`; };
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MyLife OS//JKUAT Semester Timetable//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:MyLife OS – JKUAT Semester','X-WR-TIMEZONE:Africa/Nairobi'];
    events.forEach(ev => {
      lines.push('BEGIN:VEVENT',`UID:mlos-${ev.id}@mylifeos.app`,`DTSTAMP:${fmt(new Date().toISOString())}`,`DTSTART:${fmt(ev.start_time)}`,`DTEND:${fmt(ev.end_time)}`,`SUMMARY:${ev.title.replace(/[,;]/g,' ')}`,`DESCRIPTION:${(ev.explanation||ev.category||'').replace(/[,;]/g,' ')}`,`CATEGORIES:${(ev.category||'STUDY').toUpperCase()}`,'STATUS:CONFIRMED','END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `JKUAT_Semester_Timetable_${new Date().toISOString().split('T')[0]}.ics` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setShowExportPanel(false);
    setActionNotice('✓ .ics file downloaded — import directly into Google Calendar, Apple Calendar or Outlook.');
    setTimeout(() => setActionNotice(null), 6000);
  };

  const downloadCSV = () => {
    if (!events.length) { alert('Generate a timetable first!'); return; }
    const headers = ['Week No.','Day Name','Full Date','Start Time','End Time','Duration (mins)','Unit / Session Title','Category','Locked','Completed'];
    const rows = events.map(ev => {
      const d = new Date(ev.start_time);
      const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
      const yr = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const wk = Math.ceil(((tmp.getTime() - yr.getTime()) / 86400000 + 1) / 7);
      return [
        wk,
        `"${d.toLocaleDateString('en-KE',{weekday:'long'})}"`,
        `"${d.toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}"`,
        `"${d.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}"`,
        `"${new Date(ev.end_time).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}"`,
        Math.round((new Date(ev.end_time).getTime()-d.getTime())/60000),
        `"${ev.title.replace(/"/g,'""')}"`,
        `"${ev.category}"`,
        ev.is_locked ? 'Yes' : 'No',
        ev.is_completed ? 'Yes' : 'No',
      ].join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `JKUAT_Semester_Timetable_${new Date().toISOString().split('T')[0]}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setShowExportPanel(false);
    setActionNotice('✓ Spreadsheet (.csv) downloaded — opens in Excel, Google Sheets, or Notion.');
    setTimeout(() => setActionNotice(null), 5000);
  };

  const downloadPrintable = () => {
    if (!events.length) { alert('Generate a timetable first!'); return; }
    const html = buildPrintableHTML(events, currentTerm);
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to open the printable timetable.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
    setShowExportPanel(false);
  };

  const downloadHTMLFile = () => {
    if (!events.length) { alert('Generate a timetable first!'); return; }
    const html = buildPrintableHTML(events, currentTerm);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `JKUAT_Semester_Timetable_${new Date().toISOString().split('T')[0]}.html`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowExportPanel(false);
    setActionNotice('✓ Standalone HTML Timetable file downloaded — open in any browser or print anytime!');
    setTimeout(() => setActionNotice(null), 6000);
  };

  // ── Calendar event mapping ────────────────────────────────────
  const calendarEvents = events.map(ev => {
    const c = CAT_COLORS[ev.category] || CAT_COLORS.academic;
    const bg     = ev.is_completed ? '#1e293b' : c.bg;
    const border = ev.is_completed ? '#334155' : c.border;
    return {
      id: ev.id.toString(),
      title: `${ev.is_locked ? '🔒 ' : ''}${ev.title}`,
      start: ev.start_time, end: ev.end_time,
      backgroundColor: bg, borderColor: border, textColor: '#f8fafc',
      classNames: ev.is_completed ? ['opacity-50'] : [],
    };
  });

  // Stats
  const totalHours     = events.reduce((a, ev) => a + (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 3600000, 0);
  const academicCount  = events.filter(e => e.category === 'academic').length;
  const skillsCount    = events.filter(e => e.category === 'skill').length;
  const completedCount = events.filter(e => e.is_completed).length;

  const isDayView = activeCalendarView === 'timeGridDay';

  // ═════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-3 border-b border-slate-800 no-print">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Semester Timetable</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {currentTerm?.name || 'Year 2 Semester 2'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Active Study Period:{' '}
            <span className="text-brand-300 font-semibold">{fmtDate(studyStartStr)}</span>
            {' '}→{' '}
            <span className="text-slate-300 font-medium">{fmtDate(termEndStr)}</span>
            {' '}·{' '}{calculatedWeeks} weeks · 8 SODeL units · Skills Development
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          {/* Configure Semester Dates Button */}
          <button
            onClick={() => setShowSemesterModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-brand-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Configure semester start date, end date, and enrollment date"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-brand-400" />
            <span>Semester Setup</span>
          </button>

          {/* Reschedule Today */}
          <button
            onClick={handleRescheduleToday}
            disabled={rescheduling}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rescheduling ? 'animate-spin' : ''}`} />
            {rescheduling ? 'Optimising…' : 'Reschedule Today'}
          </button>

          {/* Generate Semester Timetable */}
          <button
            onClick={handleGenerateSemester}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-brand-500/20 disabled:opacity-50 cursor-pointer transition-all"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating semester…' : `Generate Timetable (${calculatedWeeks} weeks)`}
          </button>

          {/* Export panel */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExportPanel(v => !v)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-brand-400" />
              <span>Export</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showExportPanel ? 'rotate-180' : ''}`} />
            </button>

            {showExportPanel && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-slate-950 border border-slate-700/80 shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-100 uppercase tracking-wider">Export Timetable</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{events.length} sessions · {calculatedWeeks} weeks · {fmtDate(studyStartStr)} → {fmtDate(termEndStr)}</p>
                  </div>
                  <button onClick={() => setShowExportPanel(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2 space-y-1">
                  {/* Printable Timetable Grid */}
                  <button onClick={downloadPrintable}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors group cursor-pointer">
                    <div className="w-11 h-11 rounded-xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center shrink-0 group-hover:bg-brand-500/25 transition-colors">
                      <Printer className="w-5 h-5 text-brand-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-xs font-bold text-slate-100 block">Print / Save as PDF ⭐</span>
                      <span className="text-[10px] text-slate-400 leading-snug block">Week-by-week landscape grid table with unit codes & times. Recommended!</span>
                    </div>
                  </button>

                  {/* HTML File Download */}
                  <button onClick={downloadHTMLFile}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors group cursor-pointer">
                    <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0 group-hover:bg-sky-500/25 transition-colors">
                      <FileCode className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-xs font-bold text-slate-100 block">Download Standalone HTML</span>
                      <span className="text-[10px] text-slate-400 leading-snug block">Offline schedule webpage — open on your phone or computer anytime</span>
                    </div>
                  </button>

                  {/* iCalendar */}
                  <button onClick={downloadICS}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors group cursor-pointer">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/25 transition-colors">
                      <CalendarIcon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-xs font-bold text-slate-100 block">iCalendar File (.ics)</span>
                      <span className="text-[10px] text-slate-400 leading-snug block">Import directly into Google Calendar, Apple Calendar, Outlook or phone</span>
                    </div>
                  </button>

                  {/* CSV */}
                  <button onClick={downloadCSV}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors group cursor-pointer">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-xs font-bold text-slate-100 block">Spreadsheet (.csv)</span>
                      <span className="text-[10px] text-slate-400 leading-snug block">Week No. · Day · Date · Times · Units — open in Excel or Google Sheets</span>
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
          <button onClick={() => setShowNewModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>

          {/* Availability */}
          <button onClick={() => setShowAvailability(v => !v)}
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
          { icon: <span className="font-bold text-sm">{events.length}</span>, colorClass:'brand', label:'Total Sessions', sub:`${Math.round(totalHours*10)/10}h planned` },
          { icon: <GraduationCap className="w-5 h-5"/>, colorClass:'indigo', label:'SODeL Units', sub:`${academicCount} study blocks` },
          { icon: <BookOpen className="w-5 h-5"/>, colorClass:'emerald', label:'Tech Tracks', sub:`${skillsCount} lab blocks` },
          { icon: <span className="font-bold text-xs">{events.length>0?Math.round((completedCount/events.length)*100):0}%</span>, colorClass:'amber', label:'Completion', sub:`${completedCount}/${events.length} done` },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${s.colorClass}-500/10 border border-${s.colorClass}-500/20 text-${s.colorClass}-400 flex items-center justify-center shrink-0`}>
              {s.icon}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">{s.label}</span>
              <span className="text-sm font-bold text-slate-100">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Day Navigation Strip ────────────────────────────────── */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={navigateToday}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={navigateNext}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-slate-200 ml-2">
            {isDayView ? (
              <span className="text-brand-300">
                {activeCalendarDate.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            ) : (
              <span>
                Week of {activeWeekDays[0].toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} – {activeWeekDays[6].toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </span>
        </div>

        {/* Quick Day Jumper Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {activeWeekDays.map((d, idx) => {
            const isSelected = isDayView && d.toDateString() === activeCalendarDate.toDateString();
            const isToday = d.toDateString() === new Date().toDateString();
            const dayShort = d.toLocaleDateString('en-KE', { weekday: 'short' });
            const dayNum = d.getDate();
            return (
              <button
                key={idx}
                onClick={() => navigateToDate(d, 'timeGridDay')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 font-bold'
                    : isToday
                    ? 'bg-slate-800 border border-brand-500/40 text-brand-300 hover:bg-slate-700'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                }`}
                title={`View ${d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' })}`}
              >
                <span>{dayShort}</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-white/20' : 'bg-slate-900/60 text-slate-400'}`}>
                  {dayNum}
                </span>
              </button>
            );
          })}

          {/* Switch to Week View Button */}
          {isDayView && (
            <button
              onClick={() => navigateToDate(activeCalendarDate, 'timeGridWeek')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold ml-1 cursor-pointer flex items-center gap-1"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Full Week</span>
            </button>
          )}
        </div>
      </div>

      {/* Legend & Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/70 border border-slate-800 rounded-xl no-print">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-400">
          {[['bg-indigo-500','SODeL Units'],['bg-emerald-500','Technical Skills'],['bg-purple-500','Career & Jobs'],['bg-amber-500','Personal/Rest']].map(([cls,label])=>(
            <span key={label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${cls} inline-block`}/>
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5"><Lock className="w-3 h-3"/>Locked</span>
        </div>
        <span className="text-[11px] text-slate-500 italic">Click any session block to view details, edit, lock, or mark done</span>
      </div>

      {/* Overload warning */}
      {overloadReport?.is_overloaded && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5"/>
          <div>
            <span className="font-bold uppercase tracking-wider block mb-1">Schedule Overload</span>
            <p className="text-slate-300">Demand ({overloadReport.total_needed_hours}h) exceeds availability ({overloadReport.total_available_hours}h) by <strong>{overloadReport.deficit_hours}h</strong>.</p>
            <p className="text-amber-300 italic mt-1">{overloadReport.suggestion}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-700 rounded-3xl bg-slate-900/30">
          <CalendarIcon className="w-14 h-14 text-slate-700 mb-4"/>
          <h3 className="text-slate-300 font-semibold text-lg mb-2">No semester timetable generated yet</h3>
          <p className="text-slate-500 text-sm mb-5 max-w-md">
            Your semester runs <strong className="text-slate-300">{fmtDate(studyStartStr)} → {fmtDate(termEndStr)}</strong> ({calculatedWeeks} weeks).
            Click <strong className="text-brand-400">Generate Timetable ({calculatedWeeks} weeks)</strong> above to create your complete study schedule!
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
            {['8 SODeL Units','Skills Development','Career Sessions','Spaced Repetition','No Same-Day Repeats','Nov → Dec 2026'].map(t=>(
              <span key={t} className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* FullCalendar Interactive Workspace */}
      {(loading || events.length > 0) && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
          <div className="p-3 sm:p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              initialDate={new Date().toISOString()}
              headerToolbar={{
                left:   'prev,next today',
                center: 'title',
                right:  'timeGridDay,timeGridWeek,dayGridMonth',
              }}
              buttonText={{ today:'Today', day:'Day View', week:'Week View', month:'Month View' }}
              /* Show full weekday name + date in day and week headers */
              dayHeaderFormat={{ weekday: 'long', month: 'short', day: 'numeric', omitCommas: true }}
              /* Title format: Day view writes "Tuesday, 10 November 2026", Month/Week writes "November 2026" */
              titleFormat={{ weekday: isDayView ? 'long' : undefined, month: 'long', day: isDayView ? 'numeric' : undefined, year: 'numeric' }}
              editable={true}
              droppable={true}
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              events={calendarEvents}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              height="auto"
              slotDuration="00:30:00"
              slotLabelInterval="01:00:00"
              nowIndicator={true}
              eventTimeFormat={{ hour:'2-digit', minute:'2-digit', meridiem:false }}
              eventMinHeight={26}
              datesSet={(dateInfo) => {
                setActiveCalendarView(dateInfo.view.type);
                setActiveCalendarDate(dateInfo.view.currentStart);
              }}
            />
          </div>
        </div>
      )}

      {/* ══ MODAL: Event Detail / Edit ═════════════════════════ */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={e=>{ if (e.target===e.currentTarget) setSelectedEvent(null); }}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${(CAT_COLORS[selectedEvent.category]||CAT_COLORS.academic).pill}`}>
                {selectedEvent.category} session
              </span>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4"/>
              </button>
            </div>

            {isEditingEvent ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Session Title</label>
                  <input type="text" value={editTitle} onChange={e=>setEditTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Start</label>
                    <input type="datetime-local" value={editStart} onChange={e=>setEditStart(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100"/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">End</label>
                    <input type="datetime-local" value={editEnd} onChange={e=>setEditEnd(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100"/>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveEdit} className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold cursor-pointer">Save Changes</button>
                  <button onClick={()=>setIsEditingEvent(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-slate-100 text-base leading-snug">{selectedEvent.title}</h3>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-500"/>
                    <span className="font-medium">{new Date(selectedEvent.start_time).toLocaleDateString([],{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500"/>
                    <span>
                      {new Date(selectedEvent.start_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                      {' – '}
                      {new Date(selectedEvent.end_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                    </span>
                    <span className="text-slate-500">
                      ({Math.round((new Date(selectedEvent.end_time).getTime()-new Date(selectedEvent.start_time).getTime())/60000)} min)
                    </span>
                  </div>
                </div>

                {selectedEvent.explanation && (
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-brand-400 text-xs font-semibold mb-1">
                      <Info className="w-3.5 h-3.5"/> Scheduling Decision
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedEvent.explanation}</p>
                  </div>
                )}

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
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ DRAWER: Availability ════════════════════════════════ */}
      {showAvailability && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end" onClick={e=>{if(e.target===e.currentTarget)setShowAvailability(false);}}>
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-400"/>
                <h3 className="font-bold text-slate-100 text-base">Weekly Availability Windows</h3>
              </div>
              <button onClick={()=>setShowAvailability(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-xs text-slate-400">
              Set the hours you're available to study each day. The scheduler will only place sessions within these windows.
              Leave empty to use the default windows (09:00–13:00, 15:00–18:30).
            </p>

            <form onSubmit={handleAddAvailability} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Add Window</h4>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Day</label>
                <select value={newDow} onChange={e=>setNewDow(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100">
                  {dayNames.map((n,i)=><option key={i} value={i}>{n}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Start</label>
                  <input type="time" value={newSTime} onChange={e=>setNewSTime(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"/>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">End</label>
                  <input type="time" value={newETime} onChange={e=>setNewETime(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"/>
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold cursor-pointer">
                Add Availability Window
              </button>
            </form>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Your Windows</h4>
              {availabilityRules.length === 0
                ? <p className="text-xs text-slate-500 italic">No custom windows — using defaults (09:00–13:00, 15:00–18:30 daily).</p>
                : availabilityRules.map(r=>(
                  <div key={r.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-200 block">{dayNames[r.day_of_week]}</span>
                      <span className="text-slate-400">{r.start_time} – {r.end_time}</span>
                    </div>
                    <button onClick={()=>handleDeleteAvailability(r.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Custom Event ═════════════════════════════════ */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-100 text-base">Add Custom Session</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Title</label>
                <input required type="text" placeholder="e.g. Lab Session / Group Study" value={newTitle} onChange={e=>setNewTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"/>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Category</label>
                <select value={newCat} onChange={e=>setNewCat(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100">
                  <option value="academic">SODeL Academic Study</option>
                  <option value="skill">Technical Skill Track</option>
                  <option value="career">Career / Job Prep</option>
                  <option value="personal">Personal / Rest</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Start</label>
                  <input required type="datetime-local" value={newEvStart} onChange={e=>setNewEvStart(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"/>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">End</label>
                  <input required type="datetime-local" value={newEvEnd} onChange={e=>setNewEvEnd(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"/>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="lock-new" checked={newLocked} onChange={e=>setNewLocked(e.target.checked)} className="rounded text-brand-600"/>
                <label htmlFor="lock-new" className="text-xs text-slate-300">Lock (preserve from auto-rescheduling)</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold cursor-pointer">Cancel</button>
                <button type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold cursor-pointer">Save Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Semester Setup ════════════════════════════════ */}
      <SemesterSetupModal
        isOpen={showSemesterModal}
        onClose={() => setShowSemesterModal(false)}
        onSaved={(term) => {
          setCurrentTerm(term);
          loadData();
        }}
      />

    </div>
  );
};
