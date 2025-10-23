import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCourses } from '../context/CoursesContext';
import { serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase/firebase';

/*********************\
 * Reusable Modal UI  *
\*********************/
function Modal({ open, onClose, title, children, initialFocusRef }) {
  const backdropRef = useRef(null);
  const panelRef = useRef(null);

  // Lock scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
      // Simple focus trap (cycles focus within modal)
      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const list = Array.from(focusables);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  // Auto focus preferred element or the panel
  useEffect(() => {
    if (!open) return;
    const el = initialFocusRef?.current || panelRef.current;
    // Use a microtask to ensure mounted
    const id = requestAnimationFrame(() => el?.focus?.());
    return () => cancelAnimationFrame(id);
  }, [open, initialFocusRef]);

  if (!open) return null;

  const contents = (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      // Close on click outside
      onMouseDown={(e) => {
        // Only if backdrop itself is clicked (not children)
        if (e.target === e.currentTarget) {
          // Delay close to allow onMouseUp chains if needed
          onClose?.();
        }
      }}
    >
      {/* Backdrop (blur + dim) */}
      <div className="pointer-events-none fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

      {/* Modal panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-[101] max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl border border-black/5 bg-white p-5 shadow-xl outline-none ring-1 ring-black/5 transition-all sm:p-6"
        style={{
          // subtle elevation
          boxShadow:
            '0 10px 30px -10px rgba(0,0,0,0.25), 0 10px 10px -10px rgba(0,0,0,0.15)',
        }}
      >
        {/* Close button (top-right) */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M6.225 4.811a.9.9 0 0 1 1.272 0L12 9.314l4.503-4.503a.9.9 0 1 1 1.272 1.272L13.314 10.5l4.503 4.503a.9.9 0 1 1-1.272 1.272L12 11.772l-4.503 4.503a.9.9 0 1 1-1.272-1.272l4.503-4.503-4.503-4.503a.9.9 0 0 1 0-1.272Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {title && (
          <h2
            id="modal-title"
            className="mb-3 text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );

  // Prefer #modal-root if present, else body
  const portalTarget = document.getElementById('modal-root') || document.body;
  return createPortal(contents, portalTarget);
}

/****************************\
 * Utilities from your code *
\****************************/
function rgba(hex, a = 0.08) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return `rgba(37, 99, 235, ${a})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function toDateAny(d) {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d.toDate === 'function') return d.toDate();
  if (typeof d.seconds === 'number') {
    return new Date(
      d.seconds * 1000 + (d.nanoseconds ? d.nanoseconds / 1e6 : 0),
    );
  }
  const tryDate = new Date(d);
  return isNaN(tryDate.getTime()) ? null : tryDate;
}

/**********************\
 * Refined Tasks List *
\**********************/
function TasksList({ setOpenStat, items }) {
  const accentColor = '#2563EB';
  const [editingId, setEditingId] = useState(null);
  const { allDeadlines } = useCourses();
  const { user } = useAuth();
  const uid = user?.uid;
  const [editingText, setEditingText] = useState('');
  const [editingDeadlineId, setEditingDeadlineId] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null);

  async function toggle(id, status) {
    if (!uid || !id) return;
    await updateDoc(doc(db, `users/${uid}/tasks/${id}`), {
      status,
      updatedAt: serverTimestamp(),
    });
  }
  async function remove(id) {
    if (!uid || !id) return;
    await deleteDoc(doc(db, `users/${uid}/tasks/${id}`));
  }
  const courseDeadlines = useMemo(
    () => (allDeadlines || []).filter((d) => d.getCourseId() != ''),
    [allDeadlines],
  );
  const deadlinesById = useMemo(() => {
    const m = new Map();
    for (const d of courseDeadlines) m.set(d.id, d);
    return m;
  }, [courseDeadlines]);
  function deadlineLabelById(id) {
    if (!id) return null;
    const d = deadlinesById.get(id);
    if (!d) return null;
    const date = fmtDate(d.dueAt);
    return date ? `${d.title} — ${date}` : d.title;
  }
  function fmtDate(d) {
    const dd = toDateAny(d);
    return dd
      ? dd.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;
  }
  async function saveEdit(id) {
    const title = editingText.trim();
    if (!uid || !title) {
      setEditingId(null);
      return;
    }
    await updateDoc(doc(db, `users/${uid}/tasks/${id}`), {
      title,
      deadlineId: editingDeadlineId || null,
      updatedAt: serverTimestamp(),
    });
    setEditingId(null);
    setEditingText('');
    setEditingDeadlineId(null);
  }

  // Local state to control the modal
  const [open, setOpen] = useState(true);
  const primaryActionRef = useRef(null);

  return (
    <Modal
      open={open}
      onClose={() => {
        setOpen(false);
        setOpenStat?.(null);
      }}
      title="Pending Status"
      initialFocusRef={primaryActionRef}
    >
      <p className="mb-5 text-sm text-gray-600">
        Your request is currently pending. You can review or edit your tasks
        while you wait.
      </p>

      {/* Content */}
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">No tasks yet.</p>
      ) : (
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-black/5 bg-gray-50 p-3 shadow-inner">
          <ul className="space-y-3">
            {items.map((t) => {
              const done = (t.status || 'todo') === 'done';
              const due = toDateAny(t.dueAt);
              const related = deadlineLabelById(t.deadlineId);
              const isEditing = editingId === t.id;

              return (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={(e) =>
                      toggle(t.id, e.target.checked ? 'done' : 'todo')
                    }
                    className="mt-1 h-5 w-5 cursor-pointer accent-current"
                    style={{ color: t.color || accentColor }}
                    aria-label="Toggle done"
                  />

                  {/* Content */}
                  {isEditing ? (
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(t.id);
                          if (e.key === 'Escape') {
                            setEditingId(null);
                            setEditingText('');
                            setEditingDeadlineId(null);
                          }
                        }}
                        className="w-full rounded-md border border-black/10 px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                      />
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <button
                          onClick={() => setPickerTarget(t.id)}
                          className="rounded-md border border-black/10 px-2 py-1 text-xs transition hover:bg-gray-50"
                        >
                          {editingDeadlineId
                            ? `Related: ${deadlineLabelById(editingDeadlineId)}`
                            : related
                            ? `Related: ${related}`
                            : 'Relate to deadline'}
                        </button>
                        {due && <span>📅 Due {fmtDate(t.dueAt)}</span>}
                        {t.color && (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: t.color }}
                            />
                            {t.color}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`block truncate text-sm font-medium ${
                            done
                              ? 'text-gray-400 line-through'
                              : 'text-gray-800'
                          }`}
                          title={t.title}
                        >
                          {t.title}
                        </span>
                        {t.color && (
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            title={t.color}
                            style={{ backgroundColor: t.color }}
                          />
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {due && <span>📅 Due {fmtDate(t.dueAt)}</span>}
                        {related && (
                          <span
                            className="rounded bg-gray-100 px-2 py-0.5 text-gray-700"
                            title={related}
                          >
                            ↪ {related}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(t.id)}
                        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingText('');
                          setEditingDeadlineId(null);
                        }}
                        className="rounded-md border border-black/10 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="ml-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingId(t.id);
                          setEditingText(t.title || '');
                          setEditingDeadlineId(t.deadlineId || null);
                        }}
                        className="rounded-md border border-black/10 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(t.id)}
                        className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
                        ref={primaryActionRef}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-5 flex justify-end gap-2 border-t border-black/5 pt-4">
        <button
          onClick={() => {
            setOpen(false);
            setOpenStat?.(null);
          }}
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
        <button
          onClick={() => alert('Pretend we retried the request ✨')}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    </Modal>
  );
}

export default TasksList;
