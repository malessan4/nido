'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Plus,
  Check,
  Trash2,
  Pencil,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/api';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface ProjectTask {
  id: number;
  stageId: number;
  title: string;
  isCompleted: boolean;
  completedByName: string;
  position: number;
  createdAt: string;
}

interface ProjectStage {
  id: number;
  projectId: number;
  title: string;
  position: number;
  createdAt: string;
  tasks: ProjectTask[];
}

interface Project {
  id: number;
  title: string;
  description: string;
  color: string;
  dueDate: string | null;
  createdByName: string;
  createdAt: string;
  stages: ProjectStage[];
}

type ProjectFilter = 'all' | 'active' | 'completed';

type ConfirmDeleteTarget =
  | { type: 'project'; project: Project }
  | { type: 'stage'; projectId: number; stage: ProjectStage };

const PROJECT_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
] as const;

// ─── Helpers de datos y progreso ───────────────────────────────────────────────
function normalizeProject(project: Project): Project {
  return {
    ...project,
    stages: (project.stages ?? []).map((stage) => ({
      ...stage,
      tasks: stage.tasks ?? [],
    })),
  };
}

function getStageProgress(stage: ProjectStage) {
  const total = stage.tasks.length;
  const completed = stage.tasks.filter((task) => task.isCompleted).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const isDone = total > 0 && completed === total;
  return { total, completed, percent, isDone };
}

function getProjectProgress(project: Project) {
  const totalStages = project.stages.length;
  let totalTasks = 0;
  let completedTasks = 0;
  let completedStages = 0;

  for (const stage of project.stages) {
    const stageStats = getStageProgress(stage);
    totalTasks += stageStats.total;
    completedTasks += stageStats.completed;
    if (stageStats.isDone) {
      completedStages += 1;
    }
  }

  const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const isCompleted = totalTasks > 0 && completedTasks === totalTasks;

  return {
    totalTasks,
    completedTasks,
    totalStages,
    completedStages,
    percent,
    isCompleted,
  };
}

function getDueDateBadge(dueDate: string | null, isCompleted: boolean) {
  if (!dueDate || isCompleted) return null;
  const datePart = dueDate.slice(0, 10);
  const due = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);

  if (diff < 0) {
    return {
      isUrgent: true,
      label: `Venció hace ${Math.abs(diff)}d`,
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.12)',
    };
  }
  if (diff === 0) {
    return {
      isUrgent: true,
      label: 'Vence hoy',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
    };
  }
  if (diff === 1) {
    return {
      isUrgent: false,
      label: 'Vence mañana',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.10)',
    };
  }
  if (diff <= 7) {
    return {
      isUrgent: false,
      label: `Vence en ${diff}d`,
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.10)',
    };
  }

  return {
    isUrgent: false,
    label: due.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
    color: '#64748b',
    bg: 'rgba(100,116,139,0.10)',
  };
}

function DueDatePill({ dueDate, isCompleted }: { dueDate: string | null; isCompleted: boolean }) {
  const badge = getDueDateBadge(dueDate, isCompleted);
  if (!badge) return null;
  const Icon = badge.isUrgent ? AlertTriangle : Clock;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium"
      style={{ background: badge.bg, color: badge.color }}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {badge.label}
    </span>
  );
}

// ─── Tarjeta de Proyecto (Grilla) ──────────────────────────────────────────────
function ProjectCard({
  project,
  onOpen,
  onEdit,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stats = getProjectProgress(project);
  const accentColor = stats.isCompleted ? '#10b981' : project.color || '#6366f1';
  const visibleStages = project.stages.slice(0, 4);
  const extraStages = project.stages.length - visibleStages.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group relative rounded-2xl overflow-hidden bg-glass-1 hover:bg-glass-2 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"
      style={{ border: '1px solid var(--border-glass)' }}
    >
      {/* Barra superior de acento */}
      <div className="h-1.5 w-full" style={{ background: accentColor }} />

      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Título y acciones rápidas */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-t-primary text-base leading-snug truncate">
                {project.title}
              </h3>
              {stats.isCompleted && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Completado
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-xs text-t-muted mt-1 line-clamp-2 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-80 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 rounded-lg text-t-muted hover:text-indigo-500 hover:bg-glass-2 transition-colors"
              title="Editar proyecto"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-lg text-t-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Eliminar proyecto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Badge de vencimiento */}
        {project.dueDate && !stats.isCompleted && (
          <div>
            <DueDatePill dueDate={project.dueDate} isCompleted={stats.isCompleted} />
          </div>
        )}

        {/* Progreso general */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-t-secondary">
              {stats.completedTasks}/{stats.totalTasks} tareas
            </span>
            <span className="text-lg font-extrabold tabular-nums" style={{ color: accentColor }}>
              {stats.percent}%
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden bg-glass-2"
            style={{ border: '1px solid var(--border-glass)' }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{ width: `${stats.percent}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              style={{
                background: stats.isCompleted
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : accentColor,
              }}
            />
          </div>
        </div>

        {/* Vista rápida de etapas */}
        <div className="space-y-1.5 pt-1">
          {visibleStages.map((stage) => {
            const st = getStageProgress(stage);
            return (
              <div
                key={stage.id}
                className="flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-glass-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      st.isDone ? 'bg-emerald-500 text-white' : 'text-t-muted bg-glass-1'
                    }`}
                  >
                    {st.isDone ? <Check className="w-3 h-3" /> : stage.tasks.length}
                  </span>
                  <span
                    className={`truncate ${
                      st.isDone ? 'line-through text-t-muted' : 'text-t-secondary'
                    }`}
                  >
                    {stage.title}
                  </span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums text-t-muted shrink-0">
                  {st.completed}/{st.total}
                </span>
              </div>
            );
          })}
          {extraStages > 0 && (
            <p className="text-[11px] text-t-muted pl-1">
              +{extraStages} {extraStages === 1 ? 'etapa más' : 'etapas más'}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 flex items-center justify-between text-xs text-t-muted"
        style={{ borderTop: '1px solid var(--border-glass)' }}
      >
        <span>
          {stats.totalStages} {stats.totalStages === 1 ? 'etapa' : 'etapas'}
        </span>
        <span className="font-semibold text-indigo-500 group-hover:translate-x-0.5 transition-transform">
          Abrir →
        </span>
      </div>
    </motion.div>
  );
}

// ─── Tarjeta de Etapa / Capa ───────────────────────────────────────────────────
function StageCard({
  stage,
  index,
  totalStages,
  projectColor,
  isCollapsed,
  taskInputValue,
  isSubmittingTask,
  onRegisterRef,
  onToggleCollapse,
  onMoveStage,
  onSaveStageTitle,
  onDeleteStage,
  onTaskInputChange,
  onCreateTask,
  onToggleTask,
  onSaveTaskTitle,
  onDeleteTask,
}: {
  stage: ProjectStage;
  index: number;
  totalStages: number;
  projectColor: string;
  isCollapsed: boolean;
  taskInputValue: string;
  isSubmittingTask: boolean;
  onRegisterRef: (el: HTMLDivElement | null) => void;
  onToggleCollapse: () => void;
  onMoveStage: (direction: -1 | 1) => void;
  onSaveStageTitle: (newTitle: string) => void;
  onDeleteStage: () => void;
  onTaskInputChange: (val: string) => void;
  onCreateTask: (e: React.FormEvent) => void;
  onToggleTask: (task: ProjectTask) => void;
  onSaveTaskTitle: (task: ProjectTask, newTitle: string) => void;
  onDeleteTask: (taskId: number) => void;
}) {
  const stats = getStageProgress(stage);
  const [editingStage, setEditingStage] = useState(false);
  const [stageTitleDraft, setStageTitleDraft] = useState(stage.title);

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskTitleDraft, setTaskTitleDraft] = useState('');

  const borderLeftColor = stats.isDone
    ? '#10b981'
    : stats.completed > 0
      ? projectColor
      : 'var(--border-glass)';

  const commitStageTitle = () => {
    const trimmed = stageTitleDraft.trim();
    setEditingStage(false);
    if (trimmed && trimmed !== stage.title) {
      onSaveStageTitle(trimmed);
    } else {
      setStageTitleDraft(stage.title);
    }
  };

  const startEditingStage = () => {
    setStageTitleDraft(stage.title);
    setEditingStage(true);
  };

  const commitTaskTitle = (task: ProjectTask) => {
    const trimmed = taskTitleDraft.trim();
    setEditingTaskId(null);
    if (trimmed && trimmed !== task.title) {
      onSaveTaskTitle(task, trimmed);
    }
  };

  return (
    <motion.div
      ref={onRegisterRef}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-glass-1 overflow-hidden"
      style={{
        border: '1px solid var(--border-glass)',
        borderLeft: `4px solid ${borderLeftColor}`,
      }}
    >
      {/* Encabezado de etapa */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-t-muted hover:text-t-primary hover:bg-glass-2 transition-colors shrink-0"
            title={isCollapsed ? 'Expandir etapa' : 'Colapsar etapa'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
            style={{
              background: stats.isDone ? '#10b981' : projectColor,
            }}
          >
            {stats.isDone ? <Check className="w-4 h-4" /> : index + 1}
          </div>

          {editingStage ? (
            <input
              type="text"
              value={stageTitleDraft}
              onChange={(e) => setStageTitleDraft(e.target.value)}
              onBlur={commitStageTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitStageTitle();
                } else if (e.key === 'Escape') {
                  setStageTitleDraft(stage.title);
                  setEditingStage(false);
                }
              }}
              autoFocus
              className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-glass-2 text-t-primary text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : (
            <h4 className="font-bold text-t-primary text-sm sm:text-base truncate">
              {stage.title}
            </h4>
          )}
        </div>

        {/* Pill de progreso y botones */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums"
            style={{
              background: stats.isDone ? 'rgba(16,185,129,0.15)' : 'var(--bg-glass-2)',
              color: stats.isDone ? '#10b981' : 'var(--text-secondary)',
            }}
          >
            {stats.completed}/{stats.total} · {stats.percent}%
          </span>

          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMoveStage(-1)}
            className="p-1.5 rounded-lg text-t-muted hover:text-t-primary hover:bg-glass-2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Subir etapa"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === totalStages - 1}
            onClick={() => onMoveStage(1)}
            className="p-1.5 rounded-lg text-t-muted hover:text-t-primary hover:bg-glass-2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Bajar etapa"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={startEditingStage}
            className="p-1.5 rounded-lg text-t-muted hover:text-indigo-500 hover:bg-glass-2 transition-colors"
            title="Renombrar etapa"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDeleteStage}
            className="p-1.5 rounded-lg text-t-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Eliminar etapa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mini barra de progreso de la etapa */}
      <div className="px-4 pb-3">
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-glass-2">
          <motion.div
            className="h-full rounded-full"
            initial={false}
            animate={{ width: `${stats.percent}%` }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            style={{
              background: stats.isDone ? '#10b981' : projectColor,
            }}
          />
        </div>
      </div>

      {/* Contenido colapsable: Checklist de tareas + input rápido */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-2 space-y-2"
              style={{ borderTop: '1px solid var(--border-glass)' }}
            >
              {stage.tasks.length === 0 ? (
                <p className="text-xs text-t-muted py-2 italic">
                  Sin tareas en esta etapa todavía. Agregá la primera abajo.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {stage.tasks.map((task) => {
                    const isEditing = editingTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          task.isCompleted ? 'bg-glass-2/70 opacity-75' : 'bg-glass-2'
                        }`}
                        style={{ border: '1px solid var(--border-glass)' }}
                      >
                        {/* Cuadradito de checklist */}
                        <button
                          type="button"
                          onClick={() => onToggleTask(task)}
                          aria-label={
                            task.isCompleted
                              ? `Desmarcar ${task.title}`
                              : `Marcar ${task.title} como completada`
                          }
                          className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                          style={
                            task.isCompleted
                              ? {
                                  background: stats.isDone ? '#10b981' : projectColor,
                                  borderColor: stats.isDone ? '#10b981' : projectColor,
                                  color: '#ffffff',
                                }
                              : {
                                  borderColor: 'var(--text-muted)',
                                  background: 'transparent',
                                }
                          }
                        >
                          {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        {/* Texto o input inline */}
                        {isEditing ? (
                          <input
                            type="text"
                            value={taskTitleDraft}
                            onChange={(e) => setTaskTitleDraft(e.target.value)}
                            onBlur={() => commitTaskTitle(task)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitTaskTitle(task);
                              } else if (e.key === 'Escape') {
                                setEditingTaskId(null);
                              }
                            }}
                            autoFocus
                            className="flex-1 min-w-0 px-2 py-1 rounded bg-glass-1 text-t-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <div
                            onClick={() => onToggleTask(task)}
                            className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none"
                          >
                            <span
                              className={`text-sm font-medium break-words ${
                                task.isCompleted ? 'line-through text-t-muted' : 'text-t-primary'
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.isCompleted && task.completedByName && (
                              <span className="text-[11px] text-emerald-500 font-medium shrink-0">
                                ✓ {task.completedByName}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Botones de editar y borrar tarea */}
                        <div className="flex items-center gap-0.5 shrink-0 opacity-80 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTaskId(task.id);
                              setTaskTitleDraft(task.title);
                            }}
                            className="p-1.5 rounded-lg text-t-muted hover:text-indigo-500 transition-colors"
                            title="Editar tarea"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1.5 rounded-lg text-t-muted hover:text-red-500 transition-colors"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Input rápido para agregar tarea en esta etapa */}
              <form onSubmit={onCreateTask} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={taskInputValue}
                  onChange={(e) => onTaskInputChange(e.target.value)}
                  placeholder="Agregar tarea en esta etapa..."
                  className="flex-1 min-w-0 px-3.5 py-2 rounded-xl text-t-primary placeholder-t-muted text-sm bg-glass-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ border: '1px solid var(--border-glass)' }}
                />
                <button
                  type="submit"
                  disabled={!taskInputValue.trim() || isSubmittingTask}
                  className="px-3.5 py-2 rounded-xl text-white flex items-center justify-center transition-all disabled:opacity-40 hover:scale-105 shrink-0"
                  style={{ background: projectColor }}
                  title="Agregar tarea"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Modal Crear / Editar Proyecto ─────────────────────────────────────────────
function ProjectFormModal({
  isEditing,
  title,
  description,
  dueDate,
  color,
  initialStages,
  stageDraftInput,
  isSubmitting,
  onTitleChange,
  onDescriptionChange,
  onDueDateChange,
  onColorChange,
  onStageDraftInputChange,
  onAddInitialStage,
  onRemoveInitialStage,
  onClose,
  onSubmit,
}: {
  isEditing: boolean;
  title: string;
  description: string;
  dueDate: string;
  color: string;
  initialStages: string[];
  stageDraftInput: string;
  isSubmitting: boolean;
  onTitleChange: (val: string) => void;
  onDescriptionChange: (val: string) => void;
  onDueDateChange: (val: string) => void;
  onColorChange: (val: string) => void;
  onStageDraftInputChange: (val: string) => void;
  onAddInitialStage: () => void;
  onRemoveInitialStage: (idx: number) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.form
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        onSubmit={onSubmit}
        className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 rounded-2xl flex flex-col gap-4 shadow-2xl"
        style={{ border: '1px solid var(--border-glass)', background: 'var(--bg-panel)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-t-primary">
            {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-t-muted hover:text-t-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-t-secondary">Título del proyecto *</label>
          <input
            type="text"
            placeholder="Ej: Arreglar canilla del baño, TP 1 de Gestión de Datos"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl text-t-primary placeholder-t-muted text-sm bg-glass-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ border: '1px solid var(--border-glass)' }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-t-secondary">Descripción (opcional)</label>
          <textarea
            placeholder="Notas generales o contexto del proyecto..."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl text-t-primary placeholder-t-muted text-sm bg-glass-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            style={{ border: '1px solid var(--border-glass)' }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-t-secondary">Fecha límite (opcional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-t-primary text-sm bg-glass-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ border: '1px solid var(--border-glass)' }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-t-secondary">Color</label>
            <div className="flex items-center gap-2.5 pt-1.5">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onColorChange(c)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                    color === c ? 'scale-110 ring-2 ring-offset-2 ring-indigo-400' : 'hover:scale-105'
                  }`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!isEditing && (
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-t-secondary">
              Etapas iniciales (opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: Compras, Instalación, Pruebas..."
                value={stageDraftInput}
                onChange={(e) => onStageDraftInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddInitialStage();
                  }
                }}
                className="flex-1 min-w-0 px-3.5 py-2 rounded-xl text-t-primary placeholder-t-muted text-sm bg-glass-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ border: '1px solid var(--border-glass)' }}
              />
              <button
                type="button"
                onClick={onAddInitialStage}
                disabled={!stageDraftInput.trim()}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-glass-2 text-t-primary hover:bg-glass-3 disabled:opacity-40 transition-colors"
                style={{ border: '1px solid var(--border-glass)' }}
              >
                Agregar
              </button>
            </div>

            {initialStages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {initialStages.map((stageName, idx) => (
                  <span
                    key={`${stageName}-${idx}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-glass-2 text-t-primary"
                    style={{ border: '1px solid var(--border-glass)' }}
                  >
                    <span className="text-indigo-500 font-bold">{idx + 1}.</span>
                    {stageName}
                    <button
                      type="button"
                      onClick={() => onRemoveInitialStage(idx)}
                      className="text-t-muted hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-t-muted">
              Si lo dejás vacío, se crea una etapa inicial automáticamente para que empieces a cargar tareas.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-t-secondary text-sm font-medium hover:bg-glass-1 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 hover:scale-105 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
          >
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear proyecto'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

// ─── Modal Confirmar Eliminación ───────────────────────────────────────────────
function ConfirmDeleteModal({
  target,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  target: ConfirmDeleteTarget;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isProject = target.type === 'project';
  const name = isProject ? target.project.title : target.stage.title;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        className="relative w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4"
        style={{ border: '1px solid var(--border-glass)', background: 'var(--bg-panel)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-t-primary">
              {isProject ? '¿Eliminar proyecto?' : '¿Eliminar etapa?'}
            </h3>
            <p className="text-xs text-t-secondary mt-1 leading-relaxed">
              {isProject
                ? `Se va a eliminar "${name}" junto con todas sus etapas y tareas. Esta acción no se puede deshacer.`
                : `La etapa "${name}" tiene ${target.stage.tasks.length} ${target.stage.tasks.length === 1 ? 'tarea' : 'tareas'}. Al eliminarla se perderán todas.`}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-t-secondary hover:bg-glass-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────────────
export default function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal de proyecto
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formColor, setFormColor] = useState<string>(PROJECT_COLORS[0]);
  const [initialStages, setInitialStages] = useState<string[]>([]);
  const [stageDraftInput, setStageDraftInput] = useState('');

  // Modal de confirmación
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteTarget | null>(null);

  // Estado de detalle
  const [collapsedStages, setCollapsedStages] = useState<Record<number, boolean>>({});
  const [taskInputs, setTaskInputs] = useState<Record<number, string>>({});
  const [newStageTitle, setNewStageTitle] = useState('');
  const [submittingTaskStageId, setSubmittingTaskStageId] = useState<number | null>(null);
  const [addingStage, setAddingStage] = useState(false);

  const stageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get<Project[]>('/projects');
      setProjects((res.data || []).map(normalizeProject));
      setErrorMsg(null);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setErrorMsg('No pudimos cargar los proyectos. Intentá nuevamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      try {
        const res = await api.get<Project[]>('/projects');
        if (!cancelled) {
          setProjects((res.data || []).map(normalizeProject));
          setErrorMsg(null);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        if (!cancelled) {
          setErrorMsg('No pudimos cargar los proyectos. Intentá nuevamente.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateProjectInState = (projectId: number, updater: (proj: Project) => Project) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updater(p) : p)));
  };

  // ─── Abrir modales ───────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingProjectId(null);
    setFormTitle('');
    setFormDescription('');
    setFormDueDate('');
    setFormColor(PROJECT_COLORS[0]);
    setInitialStages([]);
    setStageDraftInput('');
    setShowProjectModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProjectId(project.id);
    setFormTitle(project.title);
    setFormDescription(project.description || '');
    setFormDueDate(project.dueDate ? project.dueDate.slice(0, 10) : '');
    setFormColor(project.color || PROJECT_COLORS[0]);
    setInitialStages([]);
    setStageDraftInput('');
    setShowProjectModal(true);
  };

  const handleAddInitialStage = () => {
    const trimmed = stageDraftInput.trim();
    if (!trimmed) return;
    setInitialStages((prev) => [...prev, trimmed]);
    setStageDraftInput('');
  };

  // ─── Guardar Proyecto (Crear / Editar) ───────────────────────────────────────
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingProjectId !== null) {
        const res = await api.put<Project>(`/projects/${editingProjectId}`, {
          title: trimmedTitle,
          description: formDescription.trim(),
          color: formColor,
          dueDate: formDueDate ? formDueDate : null,
        });
        const updated = normalizeProject(res.data);
        updateProjectInState(editingProjectId, () => updated);
        setShowProjectModal(false);
      } else {
        const stagesToCreate = stageDraftInput.trim()
          ? [...initialStages, stageDraftInput.trim()]
          : initialStages;

        const res = await api.post<Project>('/projects', {
          title: trimmedTitle,
          description: formDescription.trim(),
          color: formColor,
          dueDate: formDueDate ? formDueDate : null,
          stages: stagesToCreate,
        });
        const created = normalizeProject(res.data);
        setProjects((prev) => [created, ...prev]);
        setShowProjectModal(false);
        setSelectedProjectId(created.id);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      setErrorMsg('No se pudo guardar el proyecto. Revisá los datos e intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Confirmar eliminación (Proyecto o Etapa) ────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!confirmDelete || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (confirmDelete.type === 'project') {
        const targetId = confirmDelete.project.id;
        await api.delete(`/projects/${targetId}`);
        setProjects((prev) => prev.filter((p) => p.id !== targetId));
        if (selectedProjectId === targetId) {
          setSelectedProjectId(null);
        }
      } else {
        const { projectId, stage } = confirmDelete;
        await api.delete(`/projects/${projectId}/stages/${stage.id}`);
        updateProjectInState(projectId, (proj) => ({
          ...proj,
          stages: proj.stages.filter((s) => s.id !== stage.id),
        }));
      }
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting:', error);
      setErrorMsg('No se pudo completar la eliminación.');
      fetchProjects();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Operaciones sobre Etapas ────────────────────────────────────────────────
  const handleAddStage = async (e: React.FormEvent, projectId: number) => {
    e.preventDefault();
    const trimmed = newStageTitle.trim();
    if (!trimmed || addingStage) return;

    setAddingStage(true);
    setErrorMsg(null);
    try {
      const res = await api.post<ProjectStage>(`/projects/${projectId}/stages`, { title: trimmed });
      const createdStage: ProjectStage = { ...res.data, tasks: res.data.tasks ?? [] };
      updateProjectInState(projectId, (proj) => ({
        ...proj,
        stages: [...proj.stages, createdStage],
      }));
      setNewStageTitle('');
    } catch (error) {
      console.error('Error creating stage:', error);
      setErrorMsg('No se pudo agregar la etapa.');
    } finally {
      setAddingStage(false);
    }
  };

  const handleRenameStage = async (projectId: number, stageId: number, title: string) => {
    updateProjectInState(projectId, (proj) => ({
      ...proj,
      stages: proj.stages.map((s) => (s.id === stageId ? { ...s, title } : s)),
    }));
    try {
      await api.put(`/projects/${projectId}/stages/${stageId}`, { title });
    } catch (error) {
      console.error('Error updating stage:', error);
      setErrorMsg('No se pudo renombrar la etapa.');
      fetchProjects();
    }
  };

  const handleRequestDeleteStage = async (projectId: number, stage: ProjectStage) => {
    if (stage.tasks.length > 0) {
      setConfirmDelete({ type: 'stage', projectId, stage });
      return;
    }

    updateProjectInState(projectId, (proj) => ({
      ...proj,
      stages: proj.stages.filter((s) => s.id !== stage.id),
    }));
    try {
      await api.delete(`/projects/${projectId}/stages/${stage.id}`);
    } catch (error) {
      console.error('Error deleting empty stage:', error);
      setErrorMsg('No se pudo eliminar la etapa.');
      fetchProjects();
    }
  };

  const handleMoveStage = async (project: Project, index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= project.stages.length) return;

    const reordered = [...project.stages];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const updatedStages = reordered.map((stage, idx) => ({ ...stage, position: idx }));

    updateProjectInState(project.id, (proj) => ({ ...proj, stages: updatedStages }));

    try {
      await api.patch(`/projects/${project.id}/reorder-stages`, {
        stageIds: updatedStages.map((s) => s.id),
      });
    } catch (error) {
      console.error('Error reordering stages:', error);
      setErrorMsg('No se pudo guardar el nuevo orden de etapas.');
      fetchProjects();
    }
  };

  const scrollToStage = (stageId: number) => {
    setCollapsedStages((prev) => ({ ...prev, [stageId]: false }));
    requestAnimationFrame(() => {
      stageRefs.current[stageId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  // ─── Operaciones sobre Tareas Checklist ──────────────────────────────────────
  const handleCreateTask = async (e: React.FormEvent, projectId: number, stageId: number) => {
    e.preventDefault();
    const trimmed = (taskInputs[stageId] || '').trim();
    if (!trimmed || submittingTaskStageId === stageId) return;

    setSubmittingTaskStageId(stageId);
    setErrorMsg(null);
    try {
      const res = await api.post<ProjectTask>(`/projects/${projectId}/stages/${stageId}/tasks`, {
        title: trimmed,
      });
      updateProjectInState(projectId, (proj) => ({
        ...proj,
        stages: proj.stages.map((s) =>
          s.id === stageId ? { ...s, tasks: [...s.tasks, res.data] } : s
        ),
      }));
      setTaskInputs((prev) => ({ ...prev, [stageId]: '' }));
    } catch (error) {
      console.error('Error creating task:', error);
      setErrorMsg('No se pudo agregar la tarea.');
    } finally {
      setSubmittingTaskStageId(null);
    }
  };

  const handleToggleTask = async (projectId: number, stageId: number, task: ProjectTask) => {
    const nextCompleted = !task.isCompleted;
    updateProjectInState(projectId, (proj) => ({
      ...proj,
      stages: proj.stages.map((s) =>
        s.id === stageId
          ? {
              ...s,
              tasks: s.tasks.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      isCompleted: nextCompleted,
                      completedByName: nextCompleted ? t.completedByName : '',
                    }
                  : t
              ),
            }
          : s
      ),
    }));

    try {
      const res = await api.patch<ProjectTask>(`/projects/${projectId}/tasks/${task.id}/toggle`);
      updateProjectInState(projectId, (proj) => ({
        ...proj,
        stages: proj.stages.map((s) =>
          s.id === stageId
            ? {
                ...s,
                tasks: s.tasks.map((t) => (t.id === task.id ? res.data : t)),
              }
            : s
        ),
      }));
    } catch (error) {
      console.error('Error toggling task:', error);
      setErrorMsg('No se pudo actualizar el estado de la tarea.');
      fetchProjects();
    }
  };

  const handleRenameTask = async (
    projectId: number,
    stageId: number,
    task: ProjectTask,
    title: string
  ) => {
    updateProjectInState(projectId, (proj) => ({
      ...proj,
      stages: proj.stages.map((s) =>
        s.id === stageId
          ? { ...s, tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, title } : t)) }
          : s
      ),
    }));

    try {
      await api.put(`/projects/${projectId}/tasks/${task.id}`, { title });
    } catch (error) {
      console.error('Error updating task:', error);
      setErrorMsg('No se pudo actualizar la tarea.');
      fetchProjects();
    }
  };

  const handleDeleteTask = async (projectId: number, stageId: number, taskId: number) => {
    updateProjectInState(projectId, (proj) => ({
      ...proj,
      stages: proj.stages.map((s) =>
        s.id === stageId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s
      ),
    }));

    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
    } catch (error) {
      console.error('Error deleting task:', error);
      setErrorMsg('No se pudo eliminar la tarea.');
      fetchProjects();
    }
  };

  // ─── Derivados ───────────────────────────────────────────────────────────────
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const activeCount = projects.filter((p) => !getProjectProgress(p).isCompleted).length;
  const completedCount = projects.length - activeCount;

  const filteredProjects = projects.filter((project) => {
    if (filter === 'all') return true;
    const { isCompleted } = getProjectProgress(project);
    return filter === 'completed' ? isCompleted : !isCompleted;
  });

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-[calc(100dvh-205px)] lg:h-[calc(100dvh-140px)] min-h-[440px] rounded-2xl overflow-hidden bg-glass-1"
      style={{ border: '1px solid var(--border-glass)' }}
    >
      {/* Banner de error */}
      {errorMsg && (
        <div
          className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-medium text-red-500"
          style={{
            background: 'rgba(239,68,68,0.1)',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 hover:bg-red-500/10 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selectedProject ? (
        /* ── VISTA DETALLE DE PROYECTO ──────────────────────────────────────── */
        <ProjectDetailView
          project={selectedProject}
          collapsedStages={collapsedStages}
          taskInputs={taskInputs}
          newStageTitle={newStageTitle}
          submittingTaskStageId={submittingTaskStageId}
          addingStage={addingStage}
          onBack={() => setSelectedProjectId(null)}
          onEditProject={() => openEditModal(selectedProject)}
          onDeleteProject={() => setConfirmDelete({ type: 'project', project: selectedProject })}
          onRegisterStageRef={(stageId, el) => {
            stageRefs.current[stageId] = el;
          }}
          onScrollToStage={scrollToStage}
          onToggleCollapse={(stageId) =>
            setCollapsedStages((prev) => ({ ...prev, [stageId]: !prev[stageId] }))
          }
          onMoveStage={(index, dir) => handleMoveStage(selectedProject, index, dir)}
          onSaveStageTitle={(stageId, title) => handleRenameStage(selectedProject.id, stageId, title)}
          onDeleteStage={(stage) => handleRequestDeleteStage(selectedProject.id, stage)}
          onTaskInputChange={(stageId, val) =>
            setTaskInputs((prev) => ({ ...prev, [stageId]: val }))
          }
          onCreateTask={(e, stageId) => handleCreateTask(e, selectedProject.id, stageId)}
          onToggleTask={(stageId, task) => handleToggleTask(selectedProject.id, stageId, task)}
          onSaveTaskTitle={(stageId, task, title) =>
            handleRenameTask(selectedProject.id, stageId, task, title)
          }
          onDeleteTask={(stageId, taskId) =>
            handleDeleteTask(selectedProject.id, stageId, taskId)
          }
          onNewStageTitleChange={setNewStageTitle}
          onAddStage={(e) => handleAddStage(e, selectedProject.id)}
        />
      ) : (
        /* ── VISTA LISTA / GRILLA DE PROYECTOS ──────────────────────────────── */
        <>
          <div className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--border-glass)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-t-primary">Proyectos</h2>
                  <p className="text-xs text-t-muted truncate">
                    {projects.length === 0
                      ? 'Organizá proyectos grandes por etapas y checklists'
                      : `${activeCount} en curso · ${completedCount} ${completedCount === 1 ? 'completado' : 'completados'}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition-all hover:scale-105 shadow-md shrink-0"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo proyecto</span>
              </button>
            </div>

            {projects.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {(
                  [
                    { id: 'all', label: `Todos (${projects.length})` },
                    { id: 'active', label: `En curso (${activeCount})` },
                    { id: 'completed', label: `Completados (${completedCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      filter === tab.id
                        ? 'text-white shadow-sm'
                        : 'text-t-secondary bg-glass-2 hover:text-t-primary'
                    }`}
                    style={
                      filter === tab.id
                        ? { background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }
                        : { border: '1px solid var(--border-glass)' }
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-t-muted">
                Cargando proyectos...
              </div>
            ) : projects.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div
                  className="max-w-md w-full p-6 rounded-2xl bg-glass-2 text-center space-y-4"
                  style={{ border: '1px solid var(--border-glass)' }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                  >
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-t-primary">
                      Todavía no hay proyectos
                    </h3>
                    <p className="text-xs text-t-secondary leading-relaxed">
                      Dividí tareas grandes en etapas con su checklist y seguí el porcentaje de avance en tiempo real.
                    </p>
                  </div>
                  <div className="text-left space-y-1.5 p-3 rounded-xl bg-glass-1 text-xs text-t-muted">
                    <p>
                      <span className="font-semibold text-t-secondary">• Arreglar canilla del baño:</span>{' '}
                      Comprar teflón, comprar canilla, colocar canilla.
                    </p>
                    <p>
                      <span className="font-semibold text-t-secondary">• TP 1 de Gestión de Datos:</span>{' '}
                      Modelado, Base de datos, Consultas SQL, Entrega.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="w-full py-2.5 px-4 rounded-xl text-white text-sm font-bold transition-all hover:scale-[1.02] shadow-md"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                  >
                    Crear primer proyecto
                  </button>
                </div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center text-sm text-t-muted py-12">
                No hay proyectos en esta categoría.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => setSelectedProjectId(project.id)}
                      onEdit={() => openEditModal(project)}
                      onDelete={() => setConfirmDelete({ type: 'project', project })}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modales renderizados en document.body vía Portal */}
      {showProjectModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <ProjectFormModal
              isEditing={editingProjectId !== null}
              title={formTitle}
              description={formDescription}
              dueDate={formDueDate}
              color={formColor}
              initialStages={initialStages}
              stageDraftInput={stageDraftInput}
              isSubmitting={isSubmitting}
              onTitleChange={setFormTitle}
              onDescriptionChange={setFormDescription}
              onDueDateChange={setFormDueDate}
              onColorChange={setFormColor}
              onStageDraftInputChange={setStageDraftInput}
              onAddInitialStage={handleAddInitialStage}
              onRemoveInitialStage={(idx) =>
                setInitialStages((prev) => prev.filter((_, i) => i !== idx))
              }
              onClose={() => setShowProjectModal(false)}
              onSubmit={handleSaveProject}
            />
          </AnimatePresence>,
          document.body
        )}

      {confirmDelete &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <ConfirmDeleteModal
              target={confirmDelete}
              isDeleting={isSubmitting}
              onCancel={() => setConfirmDelete(null)}
              onConfirm={handleConfirmDelete}
            />
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

// ─── Vista de Detalle del Proyecto ─────────────────────────────────────────────
function ProjectDetailView({
  project,
  collapsedStages,
  taskInputs,
  newStageTitle,
  submittingTaskStageId,
  addingStage,
  onBack,
  onEditProject,
  onDeleteProject,
  onRegisterStageRef,
  onScrollToStage,
  onToggleCollapse,
  onMoveStage,
  onSaveStageTitle,
  onDeleteStage,
  onTaskInputChange,
  onCreateTask,
  onToggleTask,
  onSaveTaskTitle,
  onDeleteTask,
  onNewStageTitleChange,
  onAddStage,
}: {
  project: Project;
  collapsedStages: Record<number, boolean>;
  taskInputs: Record<number, string>;
  newStageTitle: string;
  submittingTaskStageId: number | null;
  addingStage: boolean;
  onBack: () => void;
  onEditProject: () => void;
  onDeleteProject: () => void;
  onRegisterStageRef: (stageId: number, el: HTMLDivElement | null) => void;
  onScrollToStage: (stageId: number) => void;
  onToggleCollapse: (stageId: number) => void;
  onMoveStage: (index: number, dir: -1 | 1) => void;
  onSaveStageTitle: (stageId: number, title: string) => void;
  onDeleteStage: (stage: ProjectStage) => void;
  onTaskInputChange: (stageId: number, val: string) => void;
  onCreateTask: (e: React.FormEvent, stageId: number) => void;
  onToggleTask: (stageId: number, task: ProjectTask) => void;
  onSaveTaskTitle: (stageId: number, task: ProjectTask, title: string) => void;
  onDeleteTask: (stageId: number, taskId: number) => void;
  onNewStageTitleChange: (val: string) => void;
  onAddStage: (e: React.FormEvent) => void;
}) {
  const stats = getProjectProgress(project);
  const projectColor = project.color || '#6366f1';
  const barColor = stats.isCompleted
    ? 'linear-gradient(90deg, #10b981, #34d399)'
    : projectColor;

  return (
    <>
      {/* Top bar */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid var(--border-glass)' }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-t-secondary hover:text-t-primary hover:bg-glass-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a proyectos
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEditProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-t-secondary hover:text-indigo-500 bg-glass-2 transition-colors"
            style={{ border: '1px solid var(--border-glass)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={onDeleteProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 bg-glass-2 transition-colors"
            style={{ border: '1px solid var(--border-glass)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Cuerpo scrolleable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Panel resumen del proyecto */}
        <div
          className="rounded-2xl p-4 sm:p-5 bg-glass-2 space-y-4"
          style={{
            border: '1px solid var(--border-glass)',
            borderTop: `4px solid ${stats.isCompleted ? '#10b981' : projectColor}`,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-t-primary">{project.title}</h2>
                {stats.isCompleted && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ¡Proyecto completado!
                  </span>
                )}
              </div>

              {project.description && (
                <p className="text-sm text-t-secondary leading-relaxed">{project.description}</p>
              )}

              <div className="flex items-center gap-3 flex-wrap pt-0.5">
                <span className="inline-flex items-center gap-1 text-xs text-t-muted">
                  <User className="w-3.5 h-3.5" />
                  Creado por {project.createdByName}
                </span>
                <DueDatePill dueDate={project.dueDate} isCompleted={stats.isCompleted} />
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <div
                className="text-2xl sm:text-3xl font-extrabold tabular-nums"
                style={{ color: stats.isCompleted ? '#10b981' : projectColor }}
              >
                {stats.percent}%
              </div>
              <p className="text-xs text-t-muted font-medium">Progreso general</p>
            </div>
          </div>

          {/* Barra principal */}
          <div className="space-y-2">
            <div
              className="w-full h-3 rounded-full overflow-hidden bg-glass-1"
              style={{ border: '1px solid var(--border-glass)' }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={false}
                animate={{ width: `${stats.percent}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                style={{ background: barColor }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-t-secondary font-medium">
              <span>
                {stats.completedTasks} de {stats.totalTasks}{' '}
                {stats.totalTasks === 1 ? 'tarea completada' : 'tareas completadas'}
              </span>
              <span>
                {stats.completedStages} de {stats.totalStages}{' '}
                {stats.totalStages === 1 ? 'etapa completa' : 'etapas completas'}
              </span>
            </div>
          </div>

          {/* Tira resumen de capas / etapas */}
          {project.stages.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {project.stages.map((stage, idx) => {
                const st = getStageProgress(stage);
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => onScrollToStage(stage.id)}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl bg-glass-1 hover:bg-glass-3 transition-colors"
                    style={{ border: '1px solid var(--border-glass)' }}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: st.isDone ? '#10b981' : projectColor }}
                    >
                      {st.isDone ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                    </span>
                    <span className="font-medium text-t-primary max-w-[140px] truncate">
                      {stage.title}
                    </span>
                    <span className="text-t-muted tabular-nums">
                      {st.completed}/{st.total}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Lista de etapas / capas */}
        <div className="space-y-4">
          {project.stages.map((stage, idx) => (
            <StageCard
              key={stage.id}
              stage={stage}
              index={idx}
              totalStages={project.stages.length}
              projectColor={projectColor}
              isCollapsed={Boolean(collapsedStages[stage.id])}
              taskInputValue={taskInputs[stage.id] || ''}
              isSubmittingTask={submittingTaskStageId === stage.id}
              onRegisterRef={(el) => onRegisterStageRef(stage.id, el)}
              onToggleCollapse={() => onToggleCollapse(stage.id)}
              onMoveStage={(dir) => onMoveStage(idx, dir)}
              onSaveStageTitle={(title) => onSaveStageTitle(stage.id, title)}
              onDeleteStage={() => onDeleteStage(stage)}
              onTaskInputChange={(val) => onTaskInputChange(stage.id, val)}
              onCreateTask={(e) => onCreateTask(e, stage.id)}
              onToggleTask={(task) => onToggleTask(stage.id, task)}
              onSaveTaskTitle={(task, title) => onSaveTaskTitle(stage.id, task, title)}
              onDeleteTask={(taskId) => onDeleteTask(stage.id, taskId)}
            />
          ))}
        </div>

        {/* Formulario inline para agregar una nueva etapa */}
        <form
          onSubmit={onAddStage}
          className="p-3.5 rounded-2xl bg-glass-2 flex flex-col sm:flex-row gap-2.5"
          style={{ border: '1px dashed var(--border-glass)' }}
        >
          <input
            type="text"
            value={newStageTitle}
            onChange={(e) => onNewStageTitleChange(e.target.value)}
            placeholder="Nueva etapa / capa (ej: Instalación, Base de datos, Entrega)..."
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-t-primary placeholder-t-muted text-sm bg-glass-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ border: '1px solid var(--border-glass)' }}
          />
          <button
            type="submit"
            disabled={!newStageTitle.trim() || addingStage}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-40 hover:scale-[1.02] shrink-0"
            style={{ background: projectColor }}
          >
            <Plus className="w-4 h-4" />
            Agregar etapa
          </button>
        </form>
      </div>
    </>
  );
}
