import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  addDeadline,
  listenTasksForCourse,
} from '../../config/firebase/courses';
import { addTask } from '../../config/firebase/repositories';
import { addTaskToList } from '../../config/firebase/courses';
import ToDoList from './ToDoList';
import CalendarModal from './CalendarModal';

function withAlpha(color, alpha = 0.12) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color || '');
  if (!m) return color;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// tiny inline icons to avoid extra deps
function CalendarIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

function PencilIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export default function CourseDetailsModal({
  course, // { id, title, color, nextDeadlineText? }
  onClose, // () => void
  onUpdate, // ({ title, color }) => Promise|void
  onDelete, // () => Promise|void
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(course.title || '');
  const [color, setColor] = useState(course.color || '#6C5CE7');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  const dialogRef = useRef(null);
  const titleRef = useRef(null);

  const bg = useMemo(() => withAlpha(color, 0.12), [color]);

  // Autofocus when editing the title
  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  // Close on escape / outside click (disabled when sub-modal open)
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    function onClick(e) {
      if (dialogRef.current && !dialogRef.current.contains(e.target))
        onClose?.();
    }
    if (!showCalendar) {
      document.addEventListener('keydown', onKey);
      document.addEventListener('mousedown', onClick);
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [onClose, showCalendar]);

  // Prevent background scroll while open
  useEffect(() => {
    const { style } = document.body;
    const prev = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = prev;
    };
  }, []);

  async function handleSave() {
    if (!onUpdate) return onClose?.();
    setSaving(true);
    setError(null);
    try {
      await onUpdate({ title: title.trim() || course.title, color });
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Failed to delete');
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Dialog container */}
      <div
        ref={dialogRef}
        className="relative z-40 w-full md:max-w-lg rounded-t-2xl md:rounded-2xl bg-white shadow-xl ring-1 ring-black/10 md:mx-0 mx-0"
        style={{
          borderTop: `6px solid ${color}`,
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Inner scroll area: full-height sheet on mobile */}
        <div className="max-h-[85vh] md:max-h-[80vh] overflow-y-auto p-4 sm:p-5">
          {/* Header (title + color controls) */}
          <div className="flex items-start gap-3">
            <div
              className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-black/5"
              style={{ backgroundColor: bg, border: `2px solid ${color}` }}
            />

            <div className="flex-1 min-w-0">
              {!editingTitle ? (
                <div className="flex items-center gap-2">
                  <h2
                    id="course-modal-title"
                    className="truncate text-base sm:text-lg font-semibold text-text-900"
                    title={title}
                  >
                    {title}
                  </h2>
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="inline-flex items-center rounded-md p-1 text-text-600 hover:bg-black/5"
                    aria-label="Edit course name"
                    title="Edit course name"
                  >
                    <PencilIcon />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={titleRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingTitle(false);
                    }}
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-base outline-none focus:ring-2 focus:ring-black/20"
                    placeholder="e.g., CS 201 – Data Structures"
                  />
                  <button
                    onClick={() => setEditingTitle(false)}
                    className="rounded-md px-2 py-1 text-sm text-text-700 ring-1 ring-black/10 hover:bg-black/5"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Inline color control */}
              <div className="mt-1 flex items-center gap-2 text-xs text-text-500">
                <span>Accent</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-5 w-7 cursor-pointer rounded border border-black/10 bg-white"
                  aria-label="Pick course color"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-24 rounded border border-black/10 bg-white px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-black/20"
                  placeholder="#6C5CE7"
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-text-600 hover:bg-black/5"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="mt-4 space-y-4">
            {/* Calendar launcher */}
            <div className="rounded-xl border border-black/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-800">Calendar</p>
                  <p className="text-xs text-text-500">
                    Add deadlines or view course dates.
                  </p>
                </div>
                <button
                  onClick={() => setShowCalendar(true)}
                  className="inline-flex items-center gap-2 shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-text-700 ring-1 ring-black/10 hover:bg-black/5"
                  aria-label="Open calendar"
                  title="Open calendar"
                >
                  <CalendarIcon />
                  Open
                </button>
              </div>
            </div>

            {/* To-do list */}
            <div className="rounded-xl border border-black/10 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-800">
                    To-do list
                  </p>
                  <p className="text-xs text-text-500">
                    Quick tasks for this course.
                  </p>
                </div>
              </div>
              <ToDoList
                uid={user?.uid}
                courseId={course.id}
                accentColor={color}
              />
            </div>

            {/* Danger zone */}
            <div className="rounded-xl border border-red-200 p-3 bg-red-50/50">
              <p className="mb-2 text-xs font-semibold text-red-700">
                Danger zone
              </p>

              {!confirmingDelete ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-text-700">
                    Permanently delete this course.
                  </span>
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Delete course
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">
                    Type <span className="font-semibold">{course.title}</span>{' '}
                    to confirm deletion.
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-red-400"
                    placeholder={course.title}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleteInput !== course.title || deleting}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {deleting ? 'Deleting…' : 'Confirm delete'}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmingDelete(false);
                        setDeleteInput('');
                      }}
                      disabled={deleting}
                      className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black/70 ring-1 ring-black/10 hover:bg-white disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || deleting}
              className="rounded-xl bg-black/80 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black/70 ring-1 ring-black/10 hover:bg-white disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* SECONDARY MODAL: Calendar (above the sheet/dialog) */}
      {showCalendar && (
        <div className="z-50">
          <CalendarModal
            title={`${course.title || 'Course'} — Calendar`}
            course={course}
            onClose={() => setShowCalendar(false)}
            accentColor={color}
          />
        </div>
      )}
    </div>
  );
}
