import { useEffect, useRef, useState } from 'react';
function withAlpha(color, alpha = 0.12) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color || '');
  if (!m) return color;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ---------------- Deadline Modal (title, type, color) ---------------- */
export default function DeadlineModal({
  date,
  onClose,
  onSave,
  accentColor = '#2563EB',
  course,
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('assignment');
  const [color, setColor] = useState(course.color ? course.color : '#2563EB');
  const panelRef = useRef(null);
  const soft = withAlpha(accentColor, 0.12);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function stop(e) {
    e.stopPropagation();
  }

  const dateText = date
    ? date.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
    : '';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deadline-modal-title"
      onPointerDown={stop}
    >
      {/* Backdrop only closes this layer */}
      <div
        className="absolute inset-0 bg-black/60"
        onPointerDown={() => onClose?.()}
      />

      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10"
        style={{ borderTop: `6px solid ${accentColor}` }}
        onPointerDown={stop}
      >
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-md"
            style={{
              backgroundColor: soft,
              border: `2px solid ${accentColor}`,
            }}
            aria-hidden
          />
          <h3 id="deadline-modal-title" className="text-lg font-semibold">
            New deadline
          </h3>
          <div className="ml-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose?.();
              }}
              className="rounded-lg px-2 py-1 text-sm text-text-600 hover:bg-black/5"
              aria-label="Close deadline"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Date (read-only display) */}
          <div className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm text-text-700">
            {date ? `Due: ${dateText}` : 'Pick a date'}
          </div>

          {/* Title */}
          <label className="block text-xs font-medium text-text-600">
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
              placeholder="e.g., Assignment 3 — Trees"
            />
          </label>

          {/* Type */}
          <label className="block text-xs font-medium text-text-600">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
            >
              <option value="assignment">Assignment</option>
              <option value="quiz">Quiz</option>
              <option value="exam">Exam</option>
              <option value="project">Project</option>
              <option value="other">Other</option>
            </select>
          </label>

          {/* Color */}
          <label className="block text-xs font-medium text-text-600">
            Color
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-black/10 bg-white"
                aria-label="Pick deadline color"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
                placeholder="#2563EB"
              />
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black/70 ring-1 ring-black/10 hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const payload = {
                date,
                title: title.trim(),
                type,
                color,
              };
              if (!payload.title) return; // basic guard
              onSave?.(payload);
            }}
            disabled={!title.trim()}
            className="rounded-xl bg-black/80 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
          >
            Save deadline
          </button>
        </div>
      </div>
    </div>
  );
}
