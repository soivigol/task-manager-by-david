import { useState, useRef, useEffect } from "react";

// ─── Data ───
const STATUSES_INIT = [
  { id: "done", name: "DONE", color: "#22c55e", is_closed: true, sort_order: 0 },
  { id: "review", name: "IN REVIEW", color: "#f97316", is_closed: false, sort_order: 1 },
  { id: "today", name: "TODAY", color: "#f97316", is_closed: false, sort_order: 2 },
  { id: "open", name: "OPEN", color: "#06b6d4", is_closed: false, sort_order: 3 },
];
const CLIENTS_INIT = [
  { id: "banks", name: "Banks", color: "#dc2626", prepaid_total: 1200, prepaid_remaining: 690 },
  { id: "chavetas", name: "Chavetas", color: "#ca8a04", prepaid_total: 0, prepaid_remaining: 0 },
  { id: "others", name: "Others", color: "#6b7280", prepaid_total: 0, prepaid_remaining: 0 },
  { id: "yo", name: "Yo", color: "#f59e0b", prepaid_total: 0, prepaid_remaining: 0 },
];
const TASKS_INIT = [
  { id: "t1", parent_id: null, status_id: "today", client_id: "banks", title: "General Tasks Banks", due_date: "2026-02-28", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 480, sort_order: 0, recurrence: null },
  { id: "t2", parent_id: null, status_id: "today", client_id: "banks", title: "General Tasks McClatchy", due_date: "2026-02-28", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 270, sort_order: 1, recurrence: null },
  { id: "t3", parent_id: null, status_id: "today", client_id: "chavetas", title: "Aurareels Post Production", due_date: "2026-02-28", priority: "normal", quick_notes: "", description: "", total_tracked_minutes: 5340, sort_order: 2, recurrence: null },
  { id: "t4", parent_id: null, status_id: "today", client_id: "others", title: "Project RAG Juan Diego", due_date: "2026-02-28", priority: "normal", quick_notes: "", description: "", total_tracked_minutes: 2250, sort_order: 3, recurrence: null },
  { id: "t5", parent_id: null, status_id: "today", client_id: "others", title: "Create the new version to Escenas do Cambio 2026", due_date: "2026-02-05", priority: "normal", quick_notes: "", description: "", total_tracked_minutes: 420, sort_order: 4, recurrence: null },
  { id: "t6", parent_id: null, status_id: "open", client_id: "others", title: "Monthly maintenance fundacionjorgejove.com", due_date: "2026-02-06", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 0, recurrence: { type: "monthly", interval: 1 } },
  { id: "t7", parent_id: null, status_id: "open", client_id: "others", title: "Monthly maintenance esclavas.dev", due_date: "2026-02-06", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 1, recurrence: { type: "monthly", interval: 1 } },
  { id: "t8", parent_id: null, status_id: "open", client_id: "banks", title: "Content Deployment Banks", due_date: "2026-02-10", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 2, recurrence: { type: "weekly", interval: 1 } },
  { id: "t9", parent_id: null, status_id: "open", client_id: "banks", title: "Content Deployment", due_date: "2026-02-12", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 3, recurrence: null },
  { id: "t10", parent_id: null, status_id: "open", client_id: "others", title: "Monthly maintenance Liga Make Droner", due_date: "2026-02-26", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 4, recurrence: { type: "monthly", interval: 1 } },
  { id: "t11", parent_id: null, status_id: "open", client_id: "banks", title: "Update plugins in Banks and McClatchy", due_date: "2026-03-04", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 5, recurrence: null },
  { id: "t12", parent_id: null, status_id: "open", client_id: "others", title: "Monthly maintenance Museo Mahi", due_date: "2026-03-30", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 6, recurrence: { type: "monthly", interval: 1 } },
  { id: "t13", parent_id: null, status_id: "open", client_id: "yo", title: "Send invoices and expeensives to Sail", due_date: "2026-02-10", priority: "normal", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 7, recurrence: null },
  { id: "t14", parent_id: null, status_id: "open", client_id: "others", title: "Monthly Maintenance anjoca.com", due_date: "2026-02-15", priority: "normal", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 8, recurrence: { type: "monthly", interval: 1 } },
  { id: "t15", parent_id: null, status_id: "open", client_id: "others", title: "Create invoice and report maintenance to Fundación Jorge Jove", due_date: "2026-04-28", priority: "normal", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 9, recurrence: null },
  { id: "t16", parent_id: null, status_id: "done", client_id: "banks", title: "Update WordPress core Banks", due_date: "2026-01-15", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 90, sort_order: 0, recurrence: null },
  { id: "t17", parent_id: null, status_id: "review", client_id: "chavetas", title: "Review video export pipeline", due_date: "2026-02-03", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 180, sort_order: 0, recurrence: null },
  { id: "t18", parent_id: null, status_id: "open", client_id: "yo", title: "Weekly admin & bookkeeping", due_date: "2026-02-07", priority: "normal", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 10, recurrence: { type: "custom_weekdays", weekdays: [0, 4] } },
  { id: "st1", parent_id: "t1", status_id: "today", client_id: "banks", title: "Fix header responsive issue", due_date: "2026-02-28", priority: "normal", quick_notes: "", description: "", total_tracked_minutes: 60, sort_order: 0, recurrence: null },
  { id: "st2", parent_id: "t1", status_id: "today", client_id: "banks", title: "Update contact form plugin", due_date: "2026-02-28", priority: "normal", quick_notes: "", description: "", total_tracked_minutes: 45, sort_order: 1, recurrence: null },
  { id: "st3", parent_id: "t6", status_id: "open", client_id: "others", title: "Check SSL certificate renewal", due_date: "2026-02-06", priority: "high", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 0, recurrence: null },
];

const uid = () => "id_" + Math.random().toString(36).slice(2, 10);
const fmt = (m) => { if (!m && m !== 0) return "—"; if (m === 0) return "—"; const neg = m < 0; const abs = Math.abs(m); const h = Math.floor(abs / 60); const r = abs % 60; let s = ""; if (h > 0) s += h + "h"; if (r > 0) s += (s ? " " : "") + r + "m"; return neg ? "-" + s : s; };
const fmtDate = (d) => { if (!d) return "—"; const today = new Date("2026-02-05"); const date = new Date(d + "T00:00:00"); const diff = Math.round((date - today) / 86400000); if (diff === 0) return "Today"; if (diff === 1) return "Tomorrow"; return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }); };
const PRIORITY_MAP = { urgent: { label: "Urgent", color: "#ef4444" }, high: { label: "High", color: "#f97316" }, normal: { label: "Normal", color: "#3b82f6" }, low: { label: "Low", color: "#9ca3af" } };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const recurrenceLabel = (r) => {
  if (!r) return null;
  if (r.type === "weekly" && r.interval === 1) return "Weekly";
  if (r.type === "weekly") return `Every ${r.interval}w`;
  if (r.type === "monthly" && r.interval === 1) return "Monthly";
  if (r.type === "monthly") return `Every ${r.interval}mo`;
  if (r.type === "custom_days") return `Every ${r.days}d`;
  if (r.type === "custom_weekdays" && r.weekdays?.length) return r.weekdays.map(i => WEEKDAYS[i].slice(0, 2)).join(", ");
  return null;
};

const calcNextDue = (dateStr, rec) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (rec.type === "weekly") { d.setDate(d.getDate() + 7 * (rec.interval || 1)); }
  else if (rec.type === "monthly") { d.setMonth(d.getMonth() + (rec.interval || 1)); }
  else if (rec.type === "custom_days") { d.setDate(d.getDate() + (rec.days || 7)); }
  else if (rec.type === "custom_weekdays" && rec.weekdays?.length) {
    // Find next weekday from the list after today
    // JS getDay(): 0=Sun, our weekdays: 0=Mon → convert
    const jsToOur = (js) => (js + 6) % 7; // Sun=6, Mon=0, Tue=1...
    const ourToJs = (o) => (o + 1) % 7;
    const sorted = [...rec.weekdays].sort((a, b) => a - b);
    const todayOur = jsToOur(d.getDay());
    // Find next weekday strictly after current
    let found = sorted.find(w => w > todayOur);
    if (found !== undefined) {
      const diff = found - todayOur;
      d.setDate(d.getDate() + diff);
    } else {
      // Wrap to next week, pick first weekday
      const diff = 7 - todayOur + sorted[0];
      d.setDate(d.getDate() + diff);
    }
  }
  return d.toISOString().split("T")[0];
};

// ─── Grid template ───
const GRID = "minmax(0, 1fr) 96px 30px 78px 78px 86px";

// ─── Icons ───
const Chevron = ({ down, size = 11 }) => <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round">{down ? <path d="M6 9l6 6 6-6"/> : <path d="M9 18l6-6-6-6"/>}</svg>;
const PlusIcon = ({ s = 12 }) => <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const SearchIcon = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const ClockIcon = ({ s = 11 }) => <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
const XIcon = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const TrashIcon = () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
const GripIcon = () => <svg width="7" height="12" viewBox="0 0 7 12" fill="currentColor" opacity="0.2"><circle cx="1.5" cy="1.5" r="1.2"/><circle cx="5.5" cy="1.5" r="1.2"/><circle cx="1.5" cy="6" r="1.2"/><circle cx="5.5" cy="6" r="1.2"/><circle cx="1.5" cy="10.5" r="1.2"/><circle cx="5.5" cy="10.5" r="1.2"/></svg>;
const RepeatIcon = ({ s = 11 }) => <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;

const NavTasks = () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>;
const NavClients = () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const NavReports = () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>;
const NavSettings = () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const NavLogout = () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>;

// ─── Status Picker ───
function StatusPicker({ currentId, statuses, pos, onChange }) {
  return <div className="fixed z-[300] bg-white rounded-lg shadow-xl border border-gray-200 py-1" style={{ top: pos.y, left: pos.x, minWidth: 145 }}>
    {statuses.map(s => <button key={s.id} onClick={() => onChange(s.id)} className={`w-full flex items-center gap-2 px-3 py-[5px] text-[12px] hover:bg-gray-50 ${s.id === currentId ? "bg-gray-50 font-semibold" : ""}`}>
      <span className="w-[9px] h-[9px] rounded-full shrink-0" style={{ backgroundColor: s.color }} /><span className="text-gray-700">{s.name}</span>{s.id === currentId && <span className="ml-auto text-gray-400 text-[10px]">✓</span>}
    </button>)}
  </div>;
}

// ─── Time Popup ───
function TimePopup({ task, onSave, onClose }) {
  const [h, setH] = useState(""); const [m, setM] = useState(""); const [desc, setDesc] = useState(""); const [date, setDate] = useState("2026-02-05");
  const ref = useRef(null); useEffect(() => { ref.current?.focus(); }, []);
  const save = () => { const t = (parseInt(h) || 0) * 60 + (parseInt(m) || 0); if (t > 0) { onSave(task.id, t, desc, date); onClose(); } };
  return <div className="fixed inset-0 z-[300] flex items-center justify-center" onClick={onClose}><div className="fixed inset-0 bg-black/15" />
    <div onClick={e => e.stopPropagation()} className="relative bg-white rounded-xl shadow-2xl border border-gray-100 p-5 w-[340px]">
      <div className="flex items-center justify-between mb-2"><h3 className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5"><ClockIcon s={13} /> Add Time</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon /></button></div>
      <p className="text-[11px] text-gray-400 mb-3 truncate">{task.title}</p>
      <div className="flex gap-2 mb-3">
        <div className="flex-1"><label className="block text-[10px] text-gray-500 mb-1 font-medium">HOURS</label><input ref={ref} type="number" min="0" value={h} onChange={e => setH(e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-lg px-2.5 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" /></div>
        <div className="flex-1"><label className="block text-[10px] text-gray-500 mb-1 font-medium">MINUTES</label><input type="number" min="0" max="59" value={m} onChange={e => setM(e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-lg px-2.5 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" /></div>
        <div className="flex-1"><label className="block text-[10px] text-gray-500 mb-1 font-medium">DATE</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-1.5 py-[7px] text-[11px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" /></div>
      </div>
      <div className="mb-4"><label className="block text-[10px] text-gray-500 mb-1 font-medium">DESCRIPTION</label><input value={desc} onChange={e => setDesc(e.target.value)} onKeyDown={e => e.key === "Enter" && save()} placeholder="What did you work on?" className="w-full border border-gray-200 rounded-lg px-2.5 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" /></div>
      <button onClick={save} className="w-full bg-[#1a1a2e] text-white rounded-lg py-[8px] text-[12px] font-medium hover:bg-[#252540] transition-colors">Save Time Entry</button>
    </div></div>;
}

// ─── Recurring Toast ───
function RecurringToast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[400] bg-[#1a1a2e] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-[12px] font-medium animate-[slideUp_0.3s_ease-out]">
    <RepeatIcon s={13} /><span>{message}</span>
    <style>{`@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
  </div>;
}

// ─── Task Modal ───
function TaskModal({ task, isNew, isSubtask, parentTitle, defaultStatusId, statuses, clients, onSave, onClose, onDelete }) {
  const blank = { id: uid(), parent_id: isSubtask || null, status_id: defaultStatusId || statuses.find(s => !s.is_closed)?.id || statuses[0]?.id, client_id: null, title: "", due_date: "", priority: "normal", quick_notes: "", description: "", total_tracked_minutes: 0, sort_order: 0, recurrence: null };
  const [f, setF] = useState(task ? { ...task } : blank);

  const initRec = f.recurrence;
  const [recType, setRecType] = useState(initRec?.type === "custom_weekdays" ? "custom_weekdays" : initRec?.type === "custom_days" ? "custom_days" : initRec?.type || "none");
  const [recInterval, setRecInterval] = useState(initRec?.interval || 1);
  const [recDays, setRecDays] = useState(initRec?.days || 14);
  const [recWeekdays, setRecWeekdays] = useState(initRec?.weekdays || []);

  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const ref = useRef(null); useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);

  const toggleWeekday = (i) => {
    setRecWeekdays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i].sort((a, b) => a - b));
  };

  const buildRecurrence = () => {
    if (recType === "none") return null;
    if (recType === "weekly") return { type: "weekly", interval: recInterval };
    if (recType === "monthly") return { type: "monthly", interval: recInterval };
    if (recType === "custom_days") return { type: "custom_days", days: recDays };
    if (recType === "custom_weekdays") return recWeekdays.length > 0 ? { type: "custom_weekdays", weekdays: recWeekdays } : null;
    return null;
  };

  const handleSave = () => {
    if (f.title.trim()) { onSave({ ...f, recurrence: buildRecurrence() }, isNew); onClose(); }
  };

  return <div className="fixed inset-0 z-[300] flex items-center justify-center" onClick={onClose}><div className="fixed inset-0 bg-black/20 backdrop-blur-[1px]" />
    <div onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[540px] max-h-[84vh] flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div><h2 className="text-[13px] font-semibold text-gray-800">{isNew ? (isSubtask ? "New Subtask" : "New Task") : "Edit Task"}</h2>
          {isSubtask && parentTitle && <p className="text-[10px] text-gray-400 mt-0.5">Parent: {parentTitle}</p>}</div>
        <div className="flex items-center gap-0.5">
          {!isNew && <button onClick={() => { onDelete(f.id); onClose(); }} className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><TrashIcon /></button>}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"><XIcon /></button></div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <div><label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Title</label>
          <input ref={ref} value={f.title} onChange={e => s("title", e.target.value)} onKeyDown={e => e.key === "Enter" && handleSave()} placeholder="Task name..." className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" /></div>
        <div className="grid grid-cols-2 gap-3">
          {!isSubtask && <div><label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Status</label>
            <select value={f.status_id} onChange={e => s("status_id", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
              {statuses.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}</select></div>}
          <div><label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Client</label>
            <select value={f.client_id || ""} onChange={e => s("client_id", e.target.value || null)} className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
              <option value="">No client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Due Date</label>
            <input type="date" value={f.due_date || ""} onChange={e => s("due_date", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20" /></div>
          <div><label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Priority</label>
            <select value={f.priority} onChange={e => s("priority", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
              {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        </div>

        {/* ─── Recurrence ─── */}
        {!isSubtask && <div className="bg-gray-50/70 rounded-xl p-3 border border-gray-100">
          <label className="block text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1"><RepeatIcon s={10} /> Recurrence</label>
          <select value={recType} onChange={e => setRecType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 mb-2">
            <option value="none">No repeat</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom_days">Every X days</option>
            <option value="custom_weekdays">Specific days of the week</option>
          </select>

          {(recType === "weekly" || recType === "monthly") && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] text-gray-500">Every</span>
              <input type="number" min="1" max="52" value={recInterval} onChange={e => setRecInterval(parseInt(e.target.value) || 1)} className="w-[50px] border border-gray-200 rounded-lg px-2 py-[5px] text-[13px] text-center bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
              <span className="text-[11px] text-gray-500">{recType === "weekly" ? "week(s)" : "month(s)"}</span>
            </div>
          )}

          {recType === "custom_days" && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] text-gray-500">Every</span>
              <input type="number" min="1" value={recDays} onChange={e => setRecDays(parseInt(e.target.value) || 1)} className="w-[50px] border border-gray-200 rounded-lg px-2 py-[5px] text-[13px] text-center bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
              <span className="text-[11px] text-gray-500">days</span>
            </div>
          )}

          {recType === "custom_weekdays" && (
            <div className="flex gap-[5px] mt-1">
              {WEEKDAYS.map((day, i) => (
                <button key={i} onClick={() => toggleWeekday(i)}
                  className={`w-[38px] h-[30px] rounded-lg text-[11px] font-semibold transition-all ${recWeekdays.includes(i) ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/20" : "bg-white text-gray-500 border border-gray-200 hover:border-cyan-300 hover:text-cyan-600"}`}>
                  {day}
                </button>
              ))}
            </div>
          )}

          {recType !== "none" && <p className="text-[10px] text-cyan-600 mt-2 flex items-center gap-1">
            <RepeatIcon s={9} /> When marked as done, a new task is created with the next due date.
            {recType === "custom_weekdays" && recWeekdays.length > 0 && <span className="ml-1 text-gray-400">→ Next: {recWeekdays.map(i => WEEKDAYS[i]).join(", ")}</span>}
          </p>}
        </div>}

        <div><label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Quick Notes</label>
          <input value={f.quick_notes || ""} onChange={e => s("quick_notes", e.target.value)} placeholder="Quick note..." className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20" /></div>
        <div><label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Description</label>
          <textarea value={f.description || ""} onChange={e => s("description", e.target.value)} rows={4} placeholder="Detailed description... (Tiptap rich editor in production)" className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none" /></div>
      </div>
      <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-[6px] text-[12px] text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
        <button onClick={handleSave} className="px-4 py-[6px] text-[12px] font-medium text-white bg-[#1a1a2e] rounded-lg hover:bg-[#252540]">{isNew ? "Create" : "Save"}</button></div>
    </div></div>;
}

// ─── Settings ───
function SettingsPanel({ statuses, clients, onSave, onClose }) {
  const [tab, setTab] = useState("statuses");
  const [ls, setLs] = useState([...statuses]); const [lc, setLc] = useState([...clients]);
  const [sn, setSn] = useState(""); const [sc, setSc] = useState("#6b7280");
  const [cn, setCn] = useState(""); const [cc, setCc] = useState("#6b7280"); const [cp, setCp] = useState("");
  const addS = () => { if (sn.trim()) { setLs([...ls, { id: uid(), name: sn.trim().toUpperCase(), color: sc, is_closed: false, sort_order: ls.length }]); setSn(""); } };
  const addC = () => { if (cn.trim()) { const pm = (parseInt(cp) || 0) * 60; setLc([...lc, { id: uid(), name: cn.trim(), color: cc, prepaid_total: pm, prepaid_remaining: pm }]); setCn(""); setCp(""); } };
  return <div className="fixed inset-0 z-[300] flex items-center justify-center" onClick={onClose}><div className="fixed inset-0 bg-black/20 backdrop-blur-[1px]" />
    <div onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[460px] max-h-[75vh] flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100"><h2 className="text-[13px] font-semibold text-gray-800">Settings</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon /></button></div>
      <div className="flex border-b border-gray-100">{["statuses", "clients"].map(t => <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-[11px] font-semibold capitalize tracking-wide ${tab === t ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"}`}>{t}</button>)}</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tab === "statuses" && <>{ls.map(s => <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} /><span className="text-[12px] font-medium text-gray-700 flex-1">{s.name}</span>{s.is_closed && <span className="text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-semibold">CLOSED</span>}<button onClick={() => setLs(ls.filter(x => x.id !== s.id))} className="text-gray-300 hover:text-red-500"><TrashIcon /></button></div>)}
          <div className="flex items-center gap-2 pt-1"><input type="color" value={sc} onChange={e => setSc(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" /><input value={sn} onChange={e => setSn(e.target.value)} onKeyDown={e => e.key === "Enter" && addS()} placeholder="New status..." className="flex-1 border border-gray-200 rounded-lg px-2.5 py-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20" /><button onClick={addS} className="bg-[#1a1a2e] text-white px-2.5 py-[6px] rounded-lg text-[11px] font-medium hover:bg-[#252540]">Add</button></div></>}
        {tab === "clients" && <>{lc.map(c => <div key={c.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"><span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: c.color }} /><span className="text-[12px] font-medium text-gray-700 flex-1">{c.name}</span>{c.prepaid_total > 0 && <span className="text-[9px] bg-cyan-50 text-cyan-700 px-1 py-0.5 rounded font-semibold">{fmt(c.prepaid_remaining)}/{fmt(c.prepaid_total)}</span>}<button onClick={() => setLc(lc.filter(x => x.id !== c.id))} className="text-gray-300 hover:text-red-500"><TrashIcon /></button></div>)}
          <div className="flex items-center gap-2 pt-1"><input type="color" value={cc} onChange={e => setCc(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" /><input value={cn} onChange={e => setCn(e.target.value)} placeholder="Client name..." className="flex-1 border border-gray-200 rounded-lg px-2.5 py-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20" /><input value={cp} onChange={e => setCp(e.target.value)} onKeyDown={e => e.key === "Enter" && addC()} placeholder="Prep. h" className="w-[60px] border border-gray-200 rounded-lg px-2 py-[6px] text-[12px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20" /><button onClick={addC} className="bg-[#1a1a2e] text-white px-2.5 py-[6px] rounded-lg text-[11px] font-medium hover:bg-[#252540]">Add</button></div></>}
      </div>
      <div className="px-5 py-3 border-t border-gray-100 flex justify-end"><button onClick={() => { onSave(ls, lc); onClose(); }} className="px-4 py-[6px] text-[12px] font-medium text-white bg-[#1a1a2e] rounded-lg hover:bg-[#252540]">Save</button></div>
    </div></div>;
}

// ─── Task Row ───
function TaskRow({ task, clients, statuses, isSubtask, hasSubtasks, expanded, onToggle, onStatusClick, onTimeClick, onTitleClick, onNotesChange, onAddSubtask, dragProps }) {
  const client = clients.find(c => c.id === task.client_id);
  const status = statuses.find(s => s.id === task.status_id);
  const p = PRIORITY_MAP[task.priority] || PRIORITY_MAP.normal;
  const isPast = task.due_date && new Date(task.due_date + "T00:00:00") < new Date("2026-02-05") && !status?.is_closed;
  const rec = recurrenceLabel(task.recurrence);

  return (
    <div {...(dragProps || {})} className={`group border-b border-gray-100/60 hover:bg-[#f8f9fb] transition-colors`}>
      <div className="grid items-center h-[35px]" style={{ gridTemplateColumns: GRID }}>

        {/* COL 1: name */}
        <div className={`flex items-center min-w-0 h-full ${isSubtask ? "pl-[50px]" : "pl-[2px]"}`}>
          {!isSubtask && <div className="w-[16px] shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab"><GripIcon /></div>}
          {isSubtask && <div className="w-[16px] shrink-0" />}
          <button onClick={e => onStatusClick(task, e)} className="w-[22px] shrink-0 flex items-center justify-center">
            <span className="w-[10px] h-[10px] rounded-full border-[2px] hover:scale-[1.3] transition-transform" style={{ borderColor: status?.color || "#ccc", backgroundColor: status?.is_closed ? status.color : "transparent" }} />
          </button>
          {!isSubtask && <div className="w-[18px] shrink-0 flex items-center justify-center">
            {hasSubtasks && <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">{expanded ? <Chevron down /> : <Chevron />}</button>}
          </div>}
          <button onClick={() => onTitleClick(task)} className="flex-1 min-w-0 text-left text-[13px] text-gray-800 hover:text-cyan-700 truncate pl-1 transition-colors">{task.title}</button>
          {rec && <span className="shrink-0 text-[9px] text-cyan-600 bg-cyan-50 px-1.5 py-[2px] rounded-full flex items-center gap-0.5 mr-0.5" title={rec}><RepeatIcon s={8} />{rec}</span>}
          {!isSubtask && <button onClick={() => onAddSubtask(task.id)} title="Add subtask" className="opacity-0 group-hover:opacity-100 shrink-0 mx-0.5 w-[20px] h-[20px] rounded flex items-center justify-center text-gray-300 hover:text-cyan-600 hover:bg-cyan-50 transition-all"><PlusIcon s={10} /></button>}
        </div>

        {/* COL 2: due date */}
        <div className="text-right pr-2">
          <span className={`text-[12px] ${isPast ? "text-red-500 font-medium" : "text-gray-500"}`}>{fmtDate(task.due_date)}</span>
        </div>

        {/* COL 3: priority */}
        <div className="flex items-center justify-center">
          <span className="w-[7px] h-[7px] rounded-[2px]" style={{ backgroundColor: p.color }} title={p.label} />
        </div>

        {/* COL 4: time */}
        <button onClick={() => onTimeClick(task)} className="flex items-center justify-center gap-1 text-[12px] text-gray-400 hover:text-cyan-600 transition-colors h-full">
          <ClockIcon /><span>{fmt(task.total_tracked_minutes)}</span>
        </button>

        {/* COL 5: client */}
        <div className="flex items-center justify-center">
          {client ? <span className="text-[10px] font-semibold px-[5px] py-[1px] rounded" style={{ backgroundColor: client.color + "16", color: client.color }}>{client.name}</span> : <span className="text-gray-300 text-[12px]">—</span>}
        </div>

        {/* COL 6: notes */}
        <div className="pr-2">
          <input value={task.quick_notes || ""} onChange={e => onNotesChange(task.id, e.target.value)} placeholder="—" className="w-full text-[11px] text-gray-500 bg-transparent border-0 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gray-200 rounded px-1 py-0.5 placeholder:text-gray-300 text-right" />
        </div>
      </div>
    </div>
  );
}

// ─── Status Group ───
function StatusGroup({ status, tasks, subtasksMap, clients, statuses, search, onStatusClick, onTimeClick, onTitleClick, onNotesChange, onAddTask, onAddSubtask, onDragStart, onDrop }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState({});
  const filtered = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));
  const total = filtered.reduce((s, t) => s + (t.total_tracked_minutes || 0), 0);

  return <div className="mb-0.5">
    <div className="flex items-center gap-2 h-[30px] pl-2 cursor-pointer select-none hover:bg-gray-50/80 rounded transition-colors" onClick={() => setCollapsed(!collapsed)}>
      <span className="text-gray-400 transition-transform duration-150" style={{ transform: collapsed ? "rotate(-90deg)" : "" }}><Chevron down size={10} /></span>
      <span className="text-[10px] font-bold tracking-wide px-[7px] py-[2px] rounded text-white leading-none" style={{ backgroundColor: status.color }}>{status.name}</span>
      <span className="text-[10px] text-gray-400 font-medium">{filtered.length}</span>
      {total > 0 && <span className="text-[10px] text-gray-400">{fmt(total)}</span>}
    </div>

    {!collapsed && <>
      <div className="grid items-center h-[22px] text-[9px] font-bold text-gray-400 uppercase tracking-[0.06em] border-b border-gray-200/50" style={{ gridTemplateColumns: GRID }}>
        <div className="pl-[60px]">Name</div>
        <div className="text-right pr-2">Due date</div>
        <div />
        <div className="text-center">Time</div>
        <div className="text-center">Client</div>
        <div className="text-right pr-2">Notes</div>
      </div>

      {filtered.map(task => {
        const subs = subtasksMap[task.id] || [];
        const isExp = expanded[task.id];
        return <div key={task.id}>
          <TaskRow task={task} clients={clients} statuses={statuses} isSubtask={false}
            hasSubtasks={subs.length > 0} expanded={isExp}
            onToggle={() => setExpanded(p => ({ ...p, [task.id]: !p[task.id] }))}
            onStatusClick={onStatusClick} onTimeClick={onTimeClick} onTitleClick={onTitleClick}
            onNotesChange={onNotesChange} onAddSubtask={onAddSubtask}
            dragProps={{ draggable: true, onDragStart: e => { e.dataTransfer.setData("text/plain", task.id); onDragStart(task.id); }, onDragOver: e => e.preventDefault(), onDrop: e => { e.preventDefault(); onDrop(task.id); } }} />
          {isExp && subs.map(sub => <TaskRow key={sub.id} task={sub} clients={clients} statuses={statuses} isSubtask={true}
            hasSubtasks={false} expanded={false} onToggle={() => {}}
            onStatusClick={onStatusClick} onTimeClick={onTimeClick} onTitleClick={onTitleClick}
            onNotesChange={onNotesChange} onAddSubtask={() => {}} />)}
        </div>;
      })}

      <button onClick={() => onAddTask(status.id)} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-[11px] py-1.5 pl-[60px] transition-colors w-full text-left"><PlusIcon s={10} /> Add Task</button>
    </>}
  </div>;
}

// ─── App ───
export default function DevTask() {
  const [tasks, setTasks] = useState(TASKS_INIT);
  const [statuses, setStatuses] = useState(STATUSES_INIT);
  const [clients, setClients] = useState(CLIENTS_INIT);
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState(null);
  const [timePop, setTimePop] = useState(null);
  const [modal, setModal] = useState(null);
  const [settings, setSettings] = useState(false);
  const [page, setPage] = useState("tasks");
  const [dragId, setDragId] = useState(null);
  const [reportClient, setReportClient] = useState("all");
  const [toast, setToast] = useState(null);

  useEffect(() => { const h = () => setPicker(null); if (picker) window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, [picker]);

  const topLevel = tasks.filter(t => !t.parent_id);
  const subtasksMap = {};
  tasks.filter(t => t.parent_id).forEach(t => { if (!subtasksMap[t.parent_id]) subtasksMap[t.parent_id] = []; subtasksMap[t.parent_id].push(t); });
  const tasksByStatus = {};
  statuses.forEach(s => { tasksByStatus[s.id] = topLevel.filter(t => t.status_id === s.id).sort((a, b) => a.sort_order - b.sort_order); });

  const defaultOpenStatus = statuses.find(s => !s.is_closed);

  const onStatusClick = (task, e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setPicker({ taskId: task.id, currentStatusId: task.status_id, x: r.left, y: r.bottom + 4 }); };

  const changeStatus = (newId) => {
    const tid = picker.taskId;
    const task = tasks.find(t => t.id === tid);
    const newStatus = statuses.find(s => s.id === newId);

    setTasks(prev => {
      const mx = Math.max(0, ...prev.filter(t => t.status_id === newId && !t.parent_id).map(t => t.sort_order));
      let updated = prev.map(t => t.id === tid ? { ...t, status_id: newId, sort_order: mx + 1 } : t);

      // RECURRING: clone when moved to closed status
      if (newStatus?.is_closed && task?.recurrence && !task.parent_id) {
        const nextDue = calcNextDue(task.due_date, task.recurrence);
        const openId = defaultOpenStatus?.id || statuses[0]?.id;
        const mxOpen = Math.max(0, ...updated.filter(t => t.status_id === openId && !t.parent_id).map(t => t.sort_order));
        const newTask = {
          ...task, id: uid(), status_id: openId, due_date: nextDue,
          total_tracked_minutes: 0, quick_notes: "", sort_order: mxOpen + 1,
        };
        updated = [...updated, newTask];

        // Clone subtasks
        const subs = prev.filter(t => t.parent_id === tid);
        subs.forEach((sub, i) => {
          updated.push({ ...sub, id: uid(), parent_id: newTask.id, status_id: openId, total_tracked_minutes: 0, quick_notes: "", sort_order: i });
        });

        setToast(`Recurring task created → due ${nextDue ? fmtDate(nextDue) : "no date"}`);
      }
      return updated;
    });
    setPicker(null);
  };

  const saveTime = (tid, min) => {
    setTasks(p => p.map(t => t.id === tid ? { ...t, total_tracked_minutes: (t.total_tracked_minutes || 0) + min } : t));
    const task = tasks.find(t => t.id === tid);
    if (task?.client_id) setClients(p => p.map(c => c.id === task.client_id && c.prepaid_total > 0 ? { ...c, prepaid_remaining: c.prepaid_remaining - min } : c));
  };

  const saveTask = (f, isNew) => {
    if (isNew) {
      const same = tasks.filter(t => t.status_id === f.status_id && !t.parent_id);
      const mx = same.length > 0 ? Math.max(...same.map(t => t.sort_order)) + 1 : 0;
      setTasks(p => [...p, { ...f, sort_order: f.parent_id ? p.filter(t => t.parent_id === f.parent_id).length : mx }]);
    } else setTasks(p => p.map(t => t.id === f.id ? { ...t, ...f } : t));
  };

  const deleteTask = (id) => setTasks(p => p.filter(t => t.id !== id && t.parent_id !== id));
  const onNotesChange = (id, v) => setTasks(p => p.map(t => t.id === id ? { ...t, quick_notes: v } : t));

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) return;
    setTasks(p => {
      const d = p.find(t => t.id === dragId); const tg = p.find(t => t.id === targetId);
      if (!d || !tg || d.status_id !== tg.status_id) return p;
      const g = p.filter(t => t.status_id === d.status_id && !t.parent_id).sort((a, b) => a.sort_order - b.sort_order);
      const fl = g.filter(t => t.id !== dragId); const idx = fl.findIndex(t => t.id === targetId); fl.splice(idx, 0, d);
      const u = {}; fl.forEach((t, i) => { u[t.id] = i; }); return p.map(t => u[t.id] !== undefined ? { ...t, sort_order: u[t.id] } : t);
    }); setDragId(null);
  };

  const markPaid = (cid) => setClients(p => p.map(c => c.id === cid && c.prepaid_remaining < 0 ? { ...c, prepaid_remaining: 0 } : c));

  const nav = [{ id: "tasks", icon: <NavTasks />, tip: "Tasks" }, { id: "clients", icon: <NavClients />, tip: "Clients" }, { id: "reports", icon: <NavReports />, tip: "Reports" }];

  return (
    <div className="h-screen flex bg-[#fafafa] overflow-hidden" style={{ fontFamily: "'DM Sans',system-ui,-apple-system,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* SIDEBAR */}
      <aside className="w-[46px] shrink-0 bg-[#1a1a2e] flex flex-col items-center py-3">
        <div className="w-[28px] h-[28px] rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold text-[11px] mb-6 shadow-lg shadow-cyan-500/20">D</div>
        <nav className="flex flex-col gap-[2px] flex-1">{nav.map(n => <button key={n.id} onClick={() => setPage(n.id)} title={n.tip} className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-all ${page === n.id ? "bg-white/[0.12] text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"}`}>{n.icon}</button>)}</nav>
        <div className="flex flex-col gap-[2px]">
          <button onClick={() => setSettings(true)} title="Settings" className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"><NavSettings /></button>
          <button title="Logout" className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-white/[0.06]"><NavLogout /></button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-[44px] shrink-0 bg-white border-b border-gray-200/70 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-[14px] font-bold text-gray-900">Dev Task</h1>
            <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-[6px] py-[1px] rounded-full">{page === "tasks" ? `${topLevel.length} tasks` : page === "clients" ? `${clients.length} clients` : "Reports"}</span>
          </div>
          {page === "tasks" && <div className="flex items-center gap-2">
            <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-[28px] pr-3 py-[5px] text-[12px] bg-gray-50 border border-gray-200 rounded-lg w-[190px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 focus:bg-white transition-all placeholder:text-gray-400" /></div>
            <button onClick={() => setModal({ isNew: true })} className="flex items-center gap-1 bg-[#1a1a2e] text-white text-[12px] font-medium px-3 py-[5px] rounded-lg hover:bg-[#252540] shadow-sm"><PlusIcon s={11} /> New Task</button>
          </div>}
        </header>

        <div className="flex-1 overflow-y-auto">

          {/* TASKS */}
          {page === "tasks" && <div className="py-1 px-2">
            {statuses.map(st => <StatusGroup key={st.id} status={st} tasks={tasksByStatus[st.id] || []}
              subtasksMap={subtasksMap} clients={clients} statuses={statuses} search={search}
              onStatusClick={onStatusClick} onTimeClick={t => setTimePop(t)}
              onTitleClick={t => setModal({ task: t, isNew: false })}
              onNotesChange={onNotesChange}
              onAddTask={sid => setModal({ isNew: true, defaultStatusId: sid })}
              onAddSubtask={pid => { const par = tasks.find(t => t.id === pid); setModal({ isNew: true, isSubtask: pid, parentTitle: par?.title, defaultStatusId: par?.status_id }); }}
              onDragStart={setDragId} onDrop={handleDrop} />)}
          </div>}

          {/* CLIENTS */}
          {page === "clients" && <div className="p-4 max-w-[640px]">
            {clients.map(client => {
              const ct = tasks.filter(t => t.client_id === client.id);
              const tot = ct.reduce((s, t) => s + (t.total_tracked_minutes || 0), 0);
              const hp = client.prepaid_total > 0; const used = hp ? client.prepaid_total - client.prepaid_remaining : 0;
              const pct = hp ? Math.min(100, (used / client.prepaid_total) * 100) : 0; const neg = client.prepaid_remaining < 0;
              return <div key={client.id} className="bg-white rounded-xl border border-gray-200/80 p-4 mb-2 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><span className="w-[10px] h-[10px] rounded" style={{ backgroundColor: client.color }} /><h3 className="text-[13px] font-semibold text-gray-800">{client.name}</h3><span className="text-[10px] text-gray-400">{ct.length} tasks</span></div><span className="text-[13px] font-mono font-semibold text-gray-700">{fmt(tot)}</span></div>
                {hp && <div className="mt-1"><div className="flex justify-between text-[10px] mb-1"><span className="text-gray-500 font-medium">Prepaid</span><div className="flex items-center gap-1.5"><span className={`font-semibold ${neg ? "text-red-500" : "text-cyan-600"}`}>{fmt(client.prepaid_remaining)} / {fmt(client.prepaid_total)}</span>{neg && <button onClick={() => markPaid(client.id)} className="text-[9px] bg-red-50 text-red-600 px-1 py-0.5 rounded hover:bg-red-100 font-semibold">Mark paid</button>}</div></div><div className="h-[5px] bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${neg ? "bg-red-400" : pct > 80 ? "bg-amber-400" : "bg-cyan-400"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div></div>}
                {ct.length > 0 && <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">{ct.slice(0, 5).map(t => <div key={t.id} className="flex items-center justify-between text-[11px]"><span className="text-gray-600 truncate mr-2">{t.title}</span><span className="text-gray-400 font-mono shrink-0">{fmt(t.total_tracked_minutes)}</span></div>)}{ct.length > 5 && <p className="text-[10px] text-gray-400">+{ct.length - 5} more</p>}</div>}
              </div>;
            })}
          </div>}

          {/* REPORTS */}
          {page === "reports" && <div className="p-4 max-w-[640px]">
            <div className="bg-white rounded-xl border border-gray-200/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <div><h2 className="text-[13px] font-semibold text-gray-800">Time Report</h2><p className="text-[10px] text-gray-400 mt-0.5">February 2026</p></div>
                <div className="flex items-center gap-2">
                  <select value={reportClient} onChange={e => setReportClient(e.target.value)} className="text-[11px] border border-gray-200 rounded-lg px-2 py-[4px] bg-white focus:outline-none"><option value="all">All clients</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <button className="flex items-center gap-1 bg-[#1a1a2e] text-white text-[11px] font-medium px-2.5 py-[4px] rounded-lg hover:bg-[#252540]"><NavReports /> PDF</button></div>
              </div>
              {clients.filter(c => reportClient === "all" || c.id === reportClient).map(cl => {
                const ct = tasks.filter(t => t.client_id === cl.id && t.total_tracked_minutes > 0);
                const tot = ct.reduce((s, t) => s + (t.total_tracked_minutes || 0), 0); if (tot === 0) return null;
                return <div key={cl.id} className="mb-3">
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-200"><div className="flex items-center gap-1.5"><span className="w-[8px] h-[8px] rounded" style={{ backgroundColor: cl.color }} /><span className="text-[12px] font-semibold text-gray-800">{cl.name}</span></div><span className="text-[12px] font-mono font-bold text-gray-700">{fmt(tot)}</span></div>
                  {ct.map(t => <div key={t.id} className="flex items-center justify-between py-0.5 pl-4 text-[11px]"><span className="text-gray-600">{t.title}</span><span className="text-gray-400 font-mono">{fmt(t.total_tracked_minutes)}</span></div>)}
                  {cl.prepaid_total > 0 && <div className={`pl-4 pt-0.5 text-[10px] ${cl.prepaid_remaining < 0 ? "text-red-500" : "text-cyan-600"}`}>Prepaid: {fmt(cl.prepaid_remaining)} / {fmt(cl.prepaid_total)}</div>}
                </div>;
              })}
              <div className="flex items-center justify-between pt-3 mt-1 border-t-2 border-gray-900"><span className="text-[12px] font-bold text-gray-900">TOTAL</span><span className="text-[12px] font-mono font-bold text-gray-900">{fmt(tasks.filter(t => reportClient === "all" || t.client_id === reportClient).reduce((s, t) => s + (t.total_tracked_minutes || 0), 0))}</span></div>
            </div>
          </div>}
        </div>
      </main>

      {/* OVERLAYS */}
      {picker && <StatusPicker currentId={picker.currentStatusId} statuses={statuses} pos={{ x: picker.x, y: picker.y }} onChange={changeStatus} />}
      {timePop && <TimePopup task={timePop} onSave={saveTime} onClose={() => setTimePop(null)} />}
      {modal && <TaskModal task={modal.task || null} isNew={modal.isNew} isSubtask={modal.isSubtask || null} parentTitle={modal.parentTitle || null} defaultStatusId={modal.defaultStatusId || null} statuses={statuses} clients={clients} onSave={saveTask} onClose={() => setModal(null)} onDelete={deleteTask} />}
      {settings && <SettingsPanel statuses={statuses} clients={clients} onSave={(s, c) => { setStatuses(s); setClients(c); }} onClose={() => setSettings(false)} />}
      {toast && <RecurringToast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
