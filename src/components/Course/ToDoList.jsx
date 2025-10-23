import { useMemo, useState } from 'react';
import { serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { addTaskToList } from '../../config/firebase/courses';
import { db } from '../../config/firebase/firebase';
import { useCourses } from '../../context/CoursesContext';

/** Helpers */
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

/** Simple Modal */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-medium text-gray-800">{title}</h3>
            <button
              onClick={onClose}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Deadline Picker Modal */
function DeadlinePicker({
  open,
  onClose,
  allDeadlines,
  onSelect,
  accentColor,
}) {
  return (
    <Modal open={open} onClose={onClose} title="Relate to deadline">
      {allDeadlines.length === 0 ? (
        <p className="text-xs text-gray-500">
          No allDeadlines for this course.
        </p>
      ) : (
        <ul
          className="max-h-72 overflow-auto divide-y rounded border"
          style={{ borderColor: 'rgba(0,0,0,0.12)' }}
        >
          {allDeadlines.map((d) => {
            const due = fmtDate(d.dueAt);
            return (
              <li
                key={d.id}
                className="flex items-center justify-between px-3 py-2"
              >
                <div className="min-w-0">
                  <div
                    className="truncate text-sm text-gray-800"
                    title={d.title}
                  >
                    {d.title}
                  </div>
                  {due && (
                    <div className="text-[11px] text-gray-500">Due {due}</div>
                  )}
                </div>
                <button
                  onClick={() => onSelect(d)}
                  className="ml-3 rounded-md px-2.5 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Choose
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

export default function ToDoList({ uid, courseId, accentColor = '#2563EB' }) {
  const { tasks, allDeadlines } = useCourses();

  // UI state
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Add form state
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState(''); // yyyy-mm-dd
  const [newColor, setNewColor] = useState(accentColor);
  const [newDeadlineId, setNewDeadlineId] = useState(null);
  const [newDeadlineLabel, setNewDeadlineLabel] = useState(null);

  // Editing: deadline relation temp state
  const [editingDeadlineId, setEditingDeadlineId] = useState(null);

  // Which picker is open? 'add' | taskId | null
  const [pickerTarget, setPickerTarget] = useState(null);

  // items filtered for this course, sorted by recent activity
  const items = useMemo(() => {
    const list = (tasks || []).filter((t) => t.courseId === courseId);
    const ts = (x) => x?.updatedAt?.seconds ?? x?.createdAt?.seconds ?? 0;
    return list.sort((a, b) => ts(b) - ts(a));
  }, [tasks, courseId]);

  // allDeadlines filtered by course
  const courseDeadlines = useMemo(
    () => (allDeadlines || []).filter((d) => d.getCourseId() === courseId),
    [allDeadlines, courseId],
  );
  // Quick helper to describe a deadline
  function deadlineLabelById(id) {
    if (!id) return null;
    const d = courseDeadlines.find((x) => x.id === id);
    if (!d) return null;
    const date = fmtDate(d.dueAt);
    return date ? `${d.title} — ${date}` : d.title;
  }

  async function addItem() {
    const title = newTitle.trim();
    if (!uid || !courseId || !title) return;

    setAdding(true);
    try {
      await addTaskToList(uid, courseId, {
        courseId,
        title,
        color: newColor || null,
        dueAt: newDue ? new Date(newDue + 'T00:00:00') : null,
        deadlineId: newDeadlineId || null, // <-- relate to deadline
      });
      // reset form
      setNewTitle('');
      setNewDue('');
      setNewColor(accentColor);
      setNewDeadlineId(null);
      setNewDeadlineLabel(null);
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  }

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

  async function saveEdit(id) {
    const title = editingText.trim();
    if (!uid || !title) {
      setEditingId(null);
      return;
    }
    await updateDoc(doc(db, `users/${uid}/tasks/${id}`), {
      title,
      deadlineId: editingDeadlineId || null, // <-- save relation on edit
      updatedAt: serverTimestamp(),
    });
    setEditingId(null);
    setEditingText('');
    setEditingDeadlineId(null);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Tasks</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium"
          style={{
            borderColor: accentColor,
            color: accentColor,
            backgroundColor: rgba(accentColor, 0.06),
          }}
        >
          + Add task
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">No tasks yet.</p>
      ) : (
        <div className="max-h-[200px] overflow-y-auto rounded-xl border bg-gray-50 p-3 shadow-inner">
          <ul className="space-y-3">
            {items.map((t) => {
              const done = (t.status || 'todo') === 'done';
              const due = toDateAny(t.dueAt);
              const related = deadlineLabelById(t.deadlineId);
              const isEditing = editingId === t.id;

              return (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md"
                  style={{ borderColor: 'rgba(0,0,0,0.08)' }}
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
                    <div className="flex-1 min-w-0 space-y-2">
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
                        className="w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                      />
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <button
                          onClick={() => setPickerTarget(t.id)}
                          className="rounded-md border px-2 py-1 text-xs transition hover:bg-gray-50"
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
                    <div className="flex-1 min-w-0">
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
                        className="rounded-md border px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
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
                        className="rounded-md border px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(t.id)}
                        className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
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

      {/* Legend */}
      <p className="pt-1 text-[11px] text-gray-500">
        Tip: press <span className="font-semibold">Space</span> on a selected
        checkbox to toggle done.
      </p>

      {/* Add Task Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add task">
        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-xs text-gray-600">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'rgba(0,0,0,0.12)' }}
              placeholder="e.g., Read Chapter 3"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-gray-600">Due date</label>
            <input
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'rgba(0,0,0,0.12)' }}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-gray-600">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-8 w-10 rounded border"
                style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                aria-label="Pick color"
              />
              <input
                type="text"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                placeholder="#2563EB"
              />
            </div>
          </div>

          {/* Relate to Deadline (Add) */}
          <div className="grid gap-1">
            <label className="text-xs text-gray-600">Relate to deadline</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPickerTarget('add')}
                className="rounded-md border px-3 py-2 text-xs"
                style={{ borderColor: 'rgba(0,0,0,0.12)' }}
              >
                {newDeadlineLabel || 'Choose a deadline'}
              </button>
              {newDeadlineId && (
                <button
                  onClick={() => {
                    setNewDeadlineId(null);
                    setNewDeadlineLabel(null);
                  }}
                  className="rounded-md border px-2 py-1 text-xs text-gray-700"
                  style={{ borderColor: 'rgba(0,0,0,0.12)' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowAdd(false);
                setNewTitle('');
                setNewDue('');
                setNewColor(accentColor);
                setNewDeadlineId(null);
                setNewDeadlineLabel(null);
              }}
              className="rounded-md px-3 py-2 text-sm font-medium border text-gray-700"
              style={{ borderColor: 'rgba(0,0,0,0.12)' }}
            >
              Cancel
            </button>
            <button
              onClick={addItem}
              disabled={!newTitle.trim() || adding}
              className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: accentColor }}
            >
              {adding ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deadline Picker (reused for Add and Edit) */}
      <DeadlinePicker
        open={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        allDeadlines={courseDeadlines}
        accentColor={accentColor}
        onSelect={(d) => {
          const label = `${d.title}${
            fmtDate(d.dueAt) ? ` — ${fmtDate(d.dueAt)}` : ''
          }`;
          if (pickerTarget === 'add') {
            setNewDeadlineId(d.id);
            setNewDeadlineLabel(label);
          } else if (pickerTarget) {
            // editing a specific task
            setEditingDeadlineId(d.id);
          }
          setPickerTarget(null);
        }}
      />
    </div>
  );
}
