// src/components/CourseCard.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import CourseDetailsModal from './Course/CourseDetailsModal';
function withAlpha(color, alpha = 0.12) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color || '');
  if (!m) return color;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function CourseCard({
  id,
  title,
  color = '#6C5CE7',
  nextDeadlineText = 'Next deadline: Oct 5',
  onUpdate, // function ({ title, color }) => Promise|void
  onDelete, // function () => Promise|void
  className = '',
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [localColor, setLocalColor] = useState(color);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const titleInputRef = useRef(null);
  const bg = useMemo(
    () => withAlpha(localColor || color, 0.12),
    [localColor, color],
  );

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select?.();
    }
  }, [isEditing]);

  async function handleSave() {
    if (!onUpdate) return setIsEditing(false);
    setSaving(true);
    setError(null);
    try {
      await onUpdate({ title: localTitle.trim() || title, color: localColor });
      setIsEditing(false);
    } catch (e) {
      setError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setLocalTitle(title);
    setLocalColor(color);
    setIsEditing(false);
    setError(null);
    setConfirmingDelete(false);
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      // let parent remove it from the list; if not, snapshot will.
    } catch (e) {
      setError(e?.message || 'Failed to delete');
      setDeleting(false);
      setConfirmingDelete(false);
      return;
    }
    // Exit edit mode; the item may disappear via parent or snapshot.
    setIsEditing(false);
    setDeleting(false);
    setConfirmingDelete(false);
  }
  return (
    <>
      <div
        className={[
          'group rounded-xl p-4 shadow-sm ring-1 ring-black/5 transition cursor-pointer',
          'hover:shadow-md hover:-translate-y-0.5 hover:ring-black/10',
          className,
        ].join(' ')}
        style={{ backgroundColor: `${color}40`, border: `2px solid ${color}` }}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={`Open course ${title}`}
      >
        <h4 className="font-semibold text-text-900 flex items-center justify-between">
          <span className="truncate">{title}</span>
          <span
            className="ml-3 inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
        </h4>
        <p className="mt-1 text-sm text-text-500">{nextDeadlineText}</p>
        <div className="mt-3 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="inline-flex items-center text-xs text-text-600">
            View / edit
          </span>
        </div>
      </div>

      {open && (
        <CourseDetailsModal
          course={{ id, title, color, nextDeadlineText }}
          onClose={() => setOpen(false)}
          onUpdate={async (patch) => {
            await onUpdate?.(patch);
          }}
          onDelete={async () => {
            await onDelete?.();
          }}
        />
      )}
    </>
  );
}
