'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, GripVertical, User, ArrowRight, X,
  Calendar, CheckCircle2, Loader2, Circle, AlertTriangle, Clock
} from 'lucide-react';
import api from '@/lib/api';

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  createdAt: string;
  dueDate: string | null;
  createdByName: string;
  inProgressByName: string | null;
  completedByName: string | null;
}

const columns: { id: Task['status']; label: string; emoji: string; color: string; bg: string }[] = [
  { id: 'TODO',        label: 'Por hacer',   emoji: '📋', color: '#6366f1', bg: 'rgba(99,102,241,0.08)'  },
  { id: 'IN_PROGRESS', label: 'En progreso', emoji: '🔄', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
  { id: 'DONE',        label: 'Hecho',       emoji: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.08)'  },
];

const statusConfig = {
  TODO:        { label: 'Por hacer',   color: '#6366f1', Icon: Circle },
  IN_PROGRESS: { label: 'En progreso', color: '#f59e0b', Icon: Loader2 },
  DONE:        { label: 'Hecho',       color: '#10b981', Icon: CheckCircle2 },
};

// ─── Helpers de fecha ──────────────────────────────────────────────────────────
function getDueDateStatus(dueDate: string | null, taskStatus: Task['status']) {
  if (!dueDate || taskStatus === 'DONE') return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate + 'T00:00:00');
  const diff  = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return { level: 'overdue',  label: `Venció hace ${Math.abs(diff)}d`, color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   };
  if (diff === 0) return { level: 'today',    label: 'Vence hoy',                      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  };
  if (diff === 1) return { level: 'tomorrow', label: 'Vence mañana',                   color: '#f59e0b', bg: 'rgba(245,158,11,0.10)'  };
  if (diff <= 7)  return { level: 'soon',     label: `Vence en ${diff}d`,              color: '#6366f1', bg: 'rgba(99,102,241,0.10)'  };
  return            { level: 'ok',            label: formatShortDate(dueDate),          color: '#64748b', bg: 'rgba(100,116,139,0.10)' };
}

function formatShortDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}
function formatFullDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  };
}

// ─── Badge de vencimiento para la tarjeta ─────────────────────────────────────
function DueDateBadge({ task }: { task: Task }) {
  const ds = getDueDateStatus(task.dueDate, task.status);
  if (!ds) return null;
  const Icon = ds.level === 'overdue' || ds.level === 'today' ? AlertTriangle : Clock;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
      style={{ background: ds.bg, color: ds.color }}>
      <Icon className="w-3 h-3" />{ds.label}
    </span>
  );
}

// ─── Modal de detalle ──────────────────────────────────────────────────────────
function TaskModal({ task, onClose, onMove, onDelete, onDueDateChange, onDescriptionChange }: {
  task: Task;
  onClose: () => void;
  onMove: (task: Task, status: Task['status']) => void;
  onDelete: (id: number) => void;
  onDueDateChange: (task: Task, date: string) => void;
  onDescriptionChange: (task: Task, desc: string) => void;
}) {
  const cfg = statusConfig[task.status];
  const StatusIcon = cfg.Icon;
  const ds = getDueDateStatus(task.dueDate, task.status);
  const created = formatDateTime(task.createdAt);

  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue]     = useState(task.description || '');
  const [saving, setSaving]           = useState(false);

  useEffect(() => { setDescValue(task.description || ''); }, [task.description]);

  const saveDescription = async () => {
    if (descValue === (task.description || '')) { setEditingDesc(false); return; }
    setSaving(true);
    await onDescriptionChange(task, descValue);
    setSaving(false);
    setEditingDesc(false);
  };

  const handleDescKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') { setDescValue(task.description || ''); setEditingDesc(false); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveDescription();
  };

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

        <motion.div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-glass)' }}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}>

          {/* Header */}
          <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--border-glass)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <StatusIcon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${cfg.color}20`, color: cfg.color }}>{cfg.label}</span>
                  {ds && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: ds.bg, color: ds.color }}>
                      {(ds.level === 'overdue' || ds.level === 'today') && <AlertTriangle className="w-3 h-3" />}
                      {ds.label}
                    </span>
                  )}
                </div>
                <h2 className="text-t-primary font-bold text-lg leading-snug">{task.title}</h2>
              </div>
              <button onClick={onClose}
                className="shrink-0 p-2 rounded-xl text-t-muted hover:text-t-primary hover:bg-glass-1 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">

            {/* Descripción — editable inline */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-t-secondary uppercase tracking-wider">Descripción</p>
                {saving
                  ? <span className="text-xs text-t-muted animate-pulse">Guardando…</span>
                  : !editingDesc && (
                    <button onClick={() => setEditingDesc(true)}
                      className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                      Editar
                    </button>
                  )
                }
              </div>

              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={descValue}
                    onChange={e => setDescValue(e.target.value)}
                    onKeyDown={handleDescKeyDown}
                    onBlur={saveDescription}
                    autoFocus rows={4}
                    placeholder="Agregá una descripción…"
                    className="w-full px-4 py-3 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed bg-glass-2"
                    style={{ border: '1px solid rgba(99,102,241,0.5)' }}
                  />
                  <div className="flex items-center gap-3">
                    <button onMouseDown={e => { e.preventDefault(); saveDescription(); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white hover:scale-105 transition-all"
                      style={{ background: '#6366f1' }}>Guardar</button>
                    <button onMouseDown={e => { e.preventDefault(); setDescValue(task.description || ''); setEditingDesc(false); }}
                      className="text-xs text-t-secondary hover:text-t-primary transition-colors">Cancelar</button>
                    <span className="text-xs text-t-muted ml-auto">Ctrl+Enter · Esc</span>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditingDesc(true)}
                  className="group cursor-text px-4 py-3 rounded-xl min-h-[60px] transition-all bg-glass-1"
                  style={{ border: '1px solid var(--border-glass)' }}>
                  {descValue
                    ? <p className="text-t-secondary text-sm leading-relaxed group-hover:text-t-primary transition-colors whitespace-pre-wrap">{descValue}</p>
                    : <p className="text-t-muted text-sm italic group-hover:text-t-secondary transition-colors">Sin descripción — click para agregar</p>
                  }
                </div>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-glass-1" style={{ border: '1px solid var(--border-glass)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-t-muted" />
                  <p className="text-xs font-semibold text-t-muted">Creada</p>
                </div>
                <p className="text-t-primary text-sm font-medium capitalize leading-snug">{created.date}</p>
                <p className="text-t-secondary text-xs">{created.time}</p>
              </div>
              <div className="p-3 rounded-xl bg-glass-1" style={{ border: '1px solid var(--border-glass)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-t-muted" />
                  <p className="text-xs font-semibold text-t-muted">Creada por</p>
                </div>
                <p className="text-t-primary text-sm font-medium">{task.createdByName}</p>
              </div>
            </div>

            {/* Fecha de vencimiento — editable */}
            <div>
              <p className="text-xs font-semibold text-t-secondary uppercase tracking-wider mb-2">Fecha de vencimiento</p>
              <div className="flex items-center gap-3">
                <input type="date" defaultValue={task.dueDate ?? ''}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => onDueDateChange(task, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-t-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-glass-2"
                  style={{ border: `1px solid ${ds ? ds.color + '50' : 'var(--border-glass)'}` }} />
                {task.dueDate && (
                  <button onClick={() => onDueDateChange(task, '')}
                    className="text-xs text-t-muted hover:text-red-500 transition-colors whitespace-nowrap">
                    Quitar
                  </button>
                )}
              </div>
              {task.dueDate && (
                <p className="text-xs text-t-muted mt-1.5 capitalize">{formatFullDate(task.dueDate)}</p>
              )}
            </div>

            {/* Actividad */}
            <div>
              <p className="text-xs font-semibold text-t-secondary uppercase tracking-wider mb-3">Actividad</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(99,102,241,0.2)' }}>
                    <Circle className="w-3 h-3 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-t-secondary text-sm">
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{task.createdByName}</span>
                      <span className="text-t-muted"> creó la tarea</span>
                    </p>
                    <p className="text-t-muted text-xs capitalize">{created.date} · {created.time}</p>
                  </div>
                </div>
                {task.inProgressByName && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(245,158,11,0.2)' }}>
                      <Loader2 className="w-3 h-3 text-amber-500" />
                    </div>
                    <p className="text-t-secondary text-sm">
                      <span className="text-amber-500 font-semibold">{task.inProgressByName}</span>
                      <span className="text-t-muted"> la está trabajando</span>
                    </p>
                  </div>
                )}
                {task.completedByName && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(16,185,129,0.2)' }}>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                    <p className="text-t-secondary text-sm">
                      <span className="text-emerald-500 font-semibold">{task.completedByName}</span>
                      <span className="text-t-muted"> marcó la tarea como hecha</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Mover a */}
            {columns.filter(c => c.id !== task.status).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-t-secondary uppercase tracking-wider mb-2">Mover a</p>
                <div className="flex gap-2 flex-wrap">
                  {columns.filter(c => c.id !== task.status).map(c => (
                    <button key={c.id} onClick={() => { onMove(task, c.id); onClose(); }}
                      className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-medium transition-all hover:scale-105"
                      style={{ background: `${c.color}15`, color: c.color, border: `1px solid ${c.color}30` }}>
                      <ArrowRight className="w-3.5 h-3.5" />{c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-2" style={{ borderTop: '1px solid var(--border-glass)' }}>
            <button onClick={() => { onDelete(task.id); onClose(); }}
              className="flex items-center gap-2 text-sm text-t-muted hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Eliminar tarea
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Board principal ───────────────────────────────────────────────────────────
export default function KanbanBoard() {
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [newTitle, setNewTitle]         = useState('');
  const [newDesc, setNewDesc]           = useState('');
  const [newDue, setNewDue]             = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [dragging, setDragging]         = useState<Task | null>(null);
  const [dragOver, setDragOver]         = useState<Task['status'] | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try { const res = await api.get('/tasks'); setTasks(res.data); }
    catch (e) { console.error(e); }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await api.post('/tasks', { title: newTitle, description: newDesc, dueDate: newDue || null });
      setTasks(prev => [...prev, res.data]);
      setNewTitle(''); setNewDesc(''); setNewDue(''); setShowForm(false);
    } catch (e) { console.error(e); }
  };

  const moveTask = async (task: Task, newStatus: Task['status']) => {
    if (task.status === newStatus) return;
    try {
      const res = await api.patch(`/tasks/${task.id}/status?status=${newStatus}`);
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
      if (selectedTask?.id === task.id) setSelectedTask(res.data);
    } catch (e) { console.error(e); }
  };

  const deleteTask = async (taskId: number) => {
    try { await api.delete(`/tasks/${taskId}`); setTasks(prev => prev.filter(t => t.id !== taskId)); }
    catch (e) { console.error(e); }
  };

  const updateDueDate = async (task: Task, dateStr: string) => {
    try {
      const res = await api.patch(`/tasks/${task.id}/due-date${dateStr ? `?dueDate=${dateStr}` : ''}`);
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
      if (selectedTask?.id === task.id) setSelectedTask(res.data);
    } catch (e) { console.error(e); }
  };

  const updateDescription = async (task: Task, description: string) => {
    try {
      const res = await api.patch(`/tasks/${task.id}/description`, description, {
        headers: { 'Content-Type': 'text/plain' }
      });
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
      if (selectedTask?.id === task.id) setSelectedTask(res.data);
    } catch (e) { console.error(e); }
  };

  const handleDrop = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    if (dragging) moveTask(dragging, status);
    setDragging(null); setDragOver(null);
  };

  const TaskHistoryBadge = ({ task }: { task: Task }) => {
    if (task.status === 'TODO') return (
      <div className="flex items-center gap-1 mt-2 pt-2" style={{ borderTop: '1px solid var(--border-glass)' }}>
        <User className="w-3 h-3 text-t-muted shrink-0" />
        <span className="text-xs text-t-muted">por <span className="text-t-secondary font-medium">{task.createdByName}</span></span>
      </div>
    );
    if (task.status === 'IN_PROGRESS') return (
      <div className="flex items-center gap-1 mt-2 pt-2" style={{ borderTop: '1px solid var(--border-glass)' }}>
        <Loader2 className="w-3 h-3 text-amber-500 shrink-0" />
        <span className="text-xs"><span className="text-amber-500 font-medium">{task.inProgressByName}</span><span className="text-t-muted"> lo está haciendo</span></span>
      </div>
    );
    if (task.status === 'DONE') return (
      <div className="flex items-center gap-1 mt-2 pt-2" style={{ borderTop: '1px solid var(--border-glass)' }}>
        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
        <span className="text-xs"><span className="text-emerald-500 font-medium">{task.completedByName}</span><span className="text-t-muted"> lo completó</span></span>
      </div>
    );
    return null;
  };

  return (
    <div>
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onMove={moveTask}
          onDelete={deleteTask}
          onDueDateChange={updateDueDate}
          onDescriptionChange={updateDescription}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-t-secondary text-sm">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en total</p>
        <button onClick={() => setShowForm(!showForm)}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <Plus className="w-4 h-4" />Nueva tarea
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          onSubmit={createTask} className="mb-6 p-4 rounded-2xl space-y-3 bg-glass-1"
          style={{ border: '1px solid var(--border-glass)' }}>
          <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="¿Qué hay que hacer?" autoFocus
            className="w-full px-4 py-2.5 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-glass-2"
            style={{ border: '1px solid var(--border-glass)' }} />
          <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Descripción (opcional)..."
            className="w-full px-4 py-2.5 rounded-xl text-t-primary placeholder-t-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-glass-2"
            style={{ border: '1px solid var(--border-glass)' }} />
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-t-muted shrink-0" />
            <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 px-3 py-2 rounded-xl text-t-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-glass-2"
              style={{ border: '1px solid var(--border-glass)' }} />
            <span className="text-t-muted text-xs whitespace-nowrap">Vencimiento opcional</span>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#6366f1' }}>Agregar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-t-muted hover:text-t-primary bg-glass-1">Cancelar</button>
          </div>
        </motion.form>
      )}

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          const sorted = [...colTasks].sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          });

          return (
            <div key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, col.id)}
              className="rounded-2xl p-4 min-h-[320px] transition-all bg-glass-1"
              style={{ border: `1px solid ${dragOver === col.id ? col.color + '60' : 'var(--border-glass)'}`, boxShadow: dragOver === col.id ? `0 0 0 2px ${col.color}20` : 'none' }}>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span>{col.emoji}</span>
                  <h3 className="text-sm font-bold" style={{ color: col.color }}>{col.label}</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${col.color}20`, color: col.color }}>{colTasks.length}</span>
              </div>

              <div className="space-y-2">
                {sorted.map(task => {
                  const ds = getDueDateStatus(task.dueDate, task.status);
                  return (
                    <motion.div key={task.id} layout draggable
                      onDragStart={e => { e.stopPropagation(); setDragging(task); }}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      onClick={() => setSelectedTask(task)}
                      className="group p-3 rounded-xl cursor-pointer transition-all bg-panel"
                      style={{
                        border: ds && (ds.level === 'overdue' || ds.level === 'today')
                          ? `1px solid ${ds.color}40`
                          : '1px solid var(--border-glass)',
                      }}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileDrag={{ scale: 1.05, opacity: 0.9 }}>

                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-t-muted mt-0.5 shrink-0 group-hover:text-t-secondary transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-t-primary text-sm font-medium leading-snug">{task.title}</p>
                          {task.description && (
                            <p className="text-t-muted text-xs mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                          {ds && <div className="mt-1.5"><DueDateBadge task={task} /></div>}
                        </div>
                      </div>

                      <TaskHistoryBadge task={task} />

                      <div className="flex gap-1 mt-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all flex-wrap"
                        onClick={e => e.stopPropagation()}>
                        {columns.filter(c => c.id !== col.id).map(c => (
                          <button key={c.id} onClick={() => moveTask(task, c.id)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all hover:scale-105 font-medium"
                            style={{ background: `${c.color}15`, color: c.color }}>
                            <ArrowRight className="w-3 h-3" />{c.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="text-center py-10 text-sm select-none"
                    style={{ color: dragOver === col.id ? col.color : 'var(--text-muted)' }}>
                    {dragOver === col.id ? 'Soltá aquí ✓' : 'Arrastrá tareas aquí'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB Mobile */}
      <button
        onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        className="md:hidden fixed bottom-20 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white z-40 transition-transform active:scale-95"
        style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)' }}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
