import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import type { Event as EventModel } from '../domain/models/Event';
import { Pencil } from 'lucide-react';

function EventDetailsModal({
  event,
  onClose,
  // optional: let parent persist changes (e.g., to Firestore)
  onSave,
  onDelete,
}: {
  event: EventModel;
  onClose: () => void;
  onSave?: (updated: EventModel) => void | Promise<void>;
  onDelete?: (toDelete: EventModel) => void | Promise<void>; // <— NEW
}) {
  const dlgRef = useRef<HTMLDivElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState<string>((event as any).title || '');
  const [startInput, setStartInput] = useState<string>(
    toDateInputValue(toDate((event as any).start)),
  );

  const [saving, setSaving] = useState(false);
  const [dateInput, setDateInput] = useState<string>(
    toDateInputValue(toDate((event as any).start)),
  );
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!onDelete) return;
    // simple confirm; swap for a nicer inline confirm if you prefer
    const ok = window.confirm('Delete this event? This cannot be undone.');
    if (!ok) return;
    try {
      setDeleting(true);
      await onDelete(event);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus the dialog on open
  useEffect(() => {
    dlgRef.current?.focus();
  }, []);

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  const start = toDate((event as any).start);
  const end = (event as any).end ? toDate((event as any).end) : null;
  const when = formatDateRange(start, end || start);

  const startDate = parseDateInput(startInput);

  async function handleSave() {
    const parsed = parseDateInput(dateInput);
    const newStart = parsed ?? toDate((event as any).start);
    const updated: any = {
      ...event,
      title: title || 'Untitled event',
      start: newStart,
      end: newStart,
      color, // ✅ persist chosen color
      type: etype, // ✅ persist chosen type
    };
    try {
      setSaving(true);
      if (onSave) await onSave(updated as EventModel);
      setIsEditing(false);
      onClose();
    } finally {
      setSaving(false);
    }
  }
  function formatAllDayDate(d: Date) {
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  const [color, setColor] = useState<string>((event as any).color || '#2563EB');
  const [etype, setEtype] = useState<string>((event as any).type || 'task');
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 p-3 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dlgRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg md:max-w-xl rounded-t-2xl md:rounded-2xl bg-white shadow-xl ring-1 ring-black/10 overflow-hidden"
        onClick={stop}
        style={{
          paddingTop: 'max(0px, env(safe-area-inset-top))',
          paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-black/10 p-3 sm:p-4">
          <div
            className="h-6 w-6 shrink-0 rounded-sm ring-1 ring-black/10"
            style={{ background: color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex gap-2 items-center">
              {isEditing ? (
                <input
                  className="w-full min-w-0 rounded-md border border-black/10 px-2 py-1 text-base font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                />
              ) : (
                <h3 className="truncate text-base sm:text-lg font-semibold">
                  {' '}
                  {(event as any).title || 'Untitled event'}{' '}
                </h3>
              )}
              <button
                type="button"
                onClick={() => setIsEditing((v) => !v)}
                aria-label={isEditing ? 'Stop editing' : 'Edit'}
                className="rounded-md p-1 text-sm hover:bg-black/5"
                title={isEditing ? 'Done' : 'Edit title & dates'}
              >
                {isEditing ? '✓' : <Pencil size={14} />}
              </button>
            </div>
            {isEditing ? (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-black/80">
                <label className="flex flex-col">
                  <span className="text-xs text-black/60">Start date</span>
                  <input
                    type="date"
                    className="rounded-md border border-black/10 px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-xs text-black/60">Type</span>
                  <select
                    className="rounded-md border border-black/10 px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                    value={etype}
                    onChange={(e) => setEtype(e.target.value)}
                  >
                    {/* customize these to your EventModel domain */}
                    <option value="task">Task</option>
                    <option value="meeting">Meeting</option>
                    <option value="reminder">Reminder</option>
                    <option value="deadline">Deadline</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="flex flex-col sm:col-span-2">
                  <span className="text-xs text-black/60">Color</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      className="h-8 w-10 cursor-pointer rounded border border-black/10 bg-white"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      aria-label="Pick color"
                    />
                    <input
                      className="flex-1 min-w-[6rem] rounded-md border border-black/10 px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                      value={color}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        // allow typing hex; only accept valid 7-char #RRGGBB
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v);
                      }}
                      maxLength={7}
                      placeholder="#2563EB"
                    />
                  </div>
                  {/* Quick palette (optional) */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[
                      '#2563EB',
                      '#16A34A',
                      '#DC2626',
                      '#9333EA',
                      '#F59E0B',
                      '#0EA5E9',
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="h-6 w-6 rounded ring-1 ring-black/10"
                        style={{ background: c }}
                        onClick={() => setColor(c)}
                        aria-label={`Set color ${c}`}
                        title={c}
                      />
                    ))}
                  </div>
                </label>

                {/* {dateError && (
                  <div className="col-span-2 text-xs text-red-600">
                    {dateError}
                  </div>
                )} */}
              </div>
            ) : (
              <div className="mt-0.5 text-sm text-black/60">{when}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-lg leading-none hover:bg-black/5"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] md:max-h-[60vh] overflow-auto p-3 sm:p-4 text-sm leading-6 text-black/80">
          {(event as any).description ? (
            <p className="whitespace-pre-wrap">{(event as any).description}</p>
          ) : (
            <p className="text-black/50">No description</p>
          )}

          {/* Optional fields if present on your EventModel */}
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-[theme(spacing.20)_1fr] items-start gap-x-4 gap-y-2">
            {'location' in (event as any) && (event as any).location && (
              <>
                <dt className="text-black/50">Location</dt>
                <dd>{(event as any).location}</dd>
              </>
            )}
            {'attendees' in (event as any) &&
              Array.isArray((event as any).attendees) && (
                <>
                  <dt className="text-black/50">Attendees</dt>
                  <dd className="space-x-2">
                    {(event as any).attendees.map((a: any, i: number) => (
                      <span
                        key={i}
                        className="inline-block rounded bg-black/5 px-2 py-0.5 text-xs"
                      >
                        {typeof a === 'string'
                          ? a
                          : a?.name || a?.email || 'Unknown'}
                      </span>
                    ))}
                  </dd>
                </>
              )}
          </dl>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-black/10 p-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={saving || deleting}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
            <button
              onClick={onClose}
              disabled={deleting}
              className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-black/10 hover:bg-black/5 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateRange(start: Date, end: Date) {
  const sameDay = start.toDateString() === end.toDateString();
  const dfDate: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  const dfTime: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };
  if (sameDay) {
    return `${start.toLocaleDateString(
      undefined,
      dfDate,
    )} · ${start.toLocaleTimeString(
      undefined,
      dfTime,
    )} – ${end.toLocaleTimeString(undefined, dfTime)}`;
  }
  return `${start.toLocaleString(undefined, {
    ...dfDate,
    ...dfTime,
  })} → ${end.toLocaleString(undefined, { ...dfDate, ...dfTime })}`;
}

function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseDateInput(v: string | undefined): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const y = Number(m[1]),
    mo = Number(m[2]) - 1,
    d = Number(m[3]);
  // Set to noon local to avoid DST edges when serializing/formatting later
  return new Date(y, mo, d, 12, 0, 0, 0);
}

export default EventDetailsModal;

/* ------------------------------ helpers ------------------------------ */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function startOfWeek(d: Date, weekStartsOn: 0 | 1) {
  const date = new Date(d);
  const day = (date.getDay() - weekStartsOn + 7) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmtKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function getWeekdayLabels(weekStartsOn: 0 | 1) {
  const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return weekStartsOn === 1 ? base.slice(1).concat(base[0]) : base;
}
function buildMonthGrid(firstOfMonth: Date, weekStartsOn: 0 | 1) {
  const start = startOfWeek(firstOfMonth, weekStartsOn);
  const days = [];
  for (let i = 0; i < 42; i++) days.push({ date: addDays(start, i) });
  return days;
}
function toDate(v: string | Date) {
  return v instanceof Date ? v : new Date(v);
}
function softColor(hexOrCss: string, alpha: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexOrCss || '');
  if (!m) return hexOrCss;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function eachDayInclusive(start: Date, end: Date) {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const out: Date[] = [];
  let cur = s;
  while (cur <= e) {
    out.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

/** Accepts EventModel instances */
function mapEventsByDay(events: EventModel[]) {
  const map = new Map<
    string,
    {
      __key: string;
      color: string;
      raw: EventModel;
      span: number;
    }[]
  >();

  const nowKey = fmtKey(new Date());

  for (const raw of events || []) {
    // EventModel is expected to expose .start (Date|string), optional .end, .color, .title, .id
    const s = toDate(raw.start as any);
    const e = raw.end ? toDate(raw.end as any) : s;
    const color = (raw as any).color || '#2563EB';

    const spanDays = eachDayInclusive(s, e);
    const span = Math.max(
      1,
      Math.round((e.getTime() - s.getTime()) / 86400000) + 1,
    );

    for (const d of spanDays) {
      const key = fmtKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({
        __key: `${(raw as any).id ?? `${raw.title}-${key}`}-${key}`,
        color,
        raw,
        span,
      });
    }
  }

  // sort within each day
  for (const [, arr] of map) {
    arr.sort((a, b) => {
      const as = +toDate(a.raw.start as any);
      const bs = +toDate(b.raw.start as any);
      if (as !== bs) return as - bs;
      return (a.raw.title || '').localeCompare(b.raw.title || '');
    });
  }

  if (!map.has(nowKey)) map.set(nowKey, map.get(nowKey) || []);
  return map;
}
