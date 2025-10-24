import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import type { Event as EventModel } from '../domain/models/Event';
import EventDetailsModal from './Calendar/EventDetailsModal';
import { useAuth } from '../context/AuthContext';
import { getCourseName } from '../config/firebase/courses';

/**
 * MonthCalendar — responsive, container-aware month view
 * Fits entirely in its parent container (no scrollbars)
 */
export default function MonthCalendar({
  initialDate,
  weekStartsOn = 0,
  events = [],
  onNavigate,
  onSelectDate,
  onSelectEvent,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  isAll,
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 900, height: 700 });
  const [openEvent, setOpenEvent] = useState<EventModel | null>(null);

  // Observe container resize (width + height)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect;
        setSize({ width: rect.width, height: rect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const w = size.width;
  const h = size.height;

  // Calculate scaling and cell height dynamically
  const colW = w / 7;
  const rowH = (h - 50) / 6; // leave header space
  const cellH = Math.round(clamp(rowH, 80, 180));
  const scale = clamp(Math.min(w / 900, h / 700), 0.85, 1.1);

  const [cursor, setCursor] = useState(
    initialDate ? new Date(initialDate) : new Date(),
  );

  const firstOfMonth = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor],
  );

  const days = useMemo(
    () => buildMonthGrid(firstOfMonth, weekStartsOn),
    [firstOfMonth, weekStartsOn],
  );

  const eventMap = useMemo(() => mapEventsByDay(events), [events]);

  const goToMonth = (offset: number) => {
    const next = new Date(firstOfMonth);
    next.setMonth(next.getMonth() + offset);
    setCursor(next);
    onNavigate?.(next);
  };

  const goToday = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), 1);
    setCursor(next);
    onNavigate?.(next);
  };

  const title = firstOfMonth.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const weekDayLabels = getWeekdayLabels(weekStartsOn);

  const handleSelectEvent = useCallback(
    (e: EventModel) => {
      setOpenEvent(e);
      onSelectEvent?.(e);
    },
    [onSelectEvent],
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden"
      style={
        {
          '--mc-cell-h': `${cellH}px`,
          '--mc-fs-base': `${Math.round(14 * scale)}px`,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 sm:p-3 border-b border-black/10 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-black/10 hover:bg-black/5"
          >
            Today
          </button>
          <div className="flex">
            <button
              onClick={() => goToMonth(-1)}
              aria-label="Previous month"
              className="rounded-l-md px-3 py-1.5 ring-1 ring-black/10 hover:bg-black/5"
            >
              ‹
            </button>
            <button
              onClick={() => goToMonth(1)}
              aria-label="Next month"
              className="rounded-r-md px-3 py-1.5 ring-1 ring-black/10 hover:bg-black/5"
            >
              ›
            </button>
          </div>
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-text-900">
          {title}
        </h2>
        <span className="hidden sm:block text-xs text-text-500">
          Month view
        </span>
      </div>

      {/* Grid Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Week headers */}
        <div className="grid grid-cols-7 bg-black/5 text-[11px] sm:text-xs font-medium text-text-600 border-b border-black/10">
          {weekDayLabels.map((d) => (
            <div
              key={d}
              className="px-1 sm:px-2 py-2 text-center uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          className="grid grid-cols-7 flex-1"
          style={{
            gridTemplateRows: `repeat(6, 1fr)`,
            height: '100%',
          }}
        >
          {days.map((day, i) => {
            const isToday = sameDate(day.date, new Date());
            const isCurrentMonth =
              day.date.getMonth() === firstOfMonth.getMonth();
            const key = fmtKey(day.date);
            const dayEvents = eventMap.get(key) || [];

            return (
              <DayCell
                key={key + i}
                date={day.date}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                events={dayEvents}
                onSelectDate={onSelectDate}
                onSelectEvent={handleSelectEvent}
                onCreateEvent={onCreateEvent}
                scale={scale}
              />
            );
          })}
        </div>
      </div>

      {/* Event modal */}
      {openEvent && (
        <EventDetailsModal
          event={openEvent}
          onClose={() => setOpenEvent(null)}
          onSave={onUpdateEvent}
          onDelete={onDeleteEvent}
        />
      )}
    </div>
  );
}

/* -------------------------- DayCell -------------------------- */
function DayCell({
  date,
  isCurrentMonth,
  isToday,
  events,
  onSelectDate,
  onSelectEvent,
  onCreateEvent,
  scale = 1,
}) {
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [courseNames, setCourseNames] = useState({});
  const uid = user?.uid;

  useEffect(() => {
    async function fetchNames() {
      const map = {};
      for (const evt of events) {
        const courseId = evt.raw.courseId;
        if (courseId && !(courseId in map)) {
          map[courseId] = await getCourseName(uid, courseId);
        }
      }
      setCourseNames(map);
    }
    if (events.length) fetchNames();
  }, [events, uid]);

  const displayNum = date.getDate();
  return (
    <div
      className={[
        'hover:bg-neutral-100/50 cursor-pointer border-b  border-neutral-400/10 p-1 relative',
        !isCurrentMonth ? 'bg-black/2 text-black/50' : 'bg-white',
      ].join(' ')}
      onDoubleClick={() => onCreateEvent?.(date)}
      onClick={(e) => {
        if (e.target instanceof HTMLElement && e.target.closest('[data-evt]'))
          return;
        onSelectDate?.(date);
      }}
    >
      {/* Date label */}
      <div className="flex items-center justify-between">
        <div
          className={[
            'font-medium',
            isCurrentMonth ? 'text-text-700' : 'text-text-400',
          ].join(' ')}
          style={{ fontSize: `${Math.round(12 * scale)}px` }}
        >
          {displayNum}
        </div>
        {isToday && (
          <span className="inline-flex items-center rounded-full bg-blue-600 text-white font-semibold px-2 py-[1px] text-[10px]">
            Today
          </span>
        )}
      </div>

      {/* Events list */}
      <div className="mt-1 space-y-1">
        {events.slice(0, 2).map((evt) => (
          <button
            key={evt.__key}
            data-evt
            onClick={() => onSelectEvent?.(evt.raw)}
            className="w-full truncate rounded-md px-2 py-1 text-left text-xs ring-1 ring-black/10 hover:ring-black/20"
            style={{
              backgroundColor: softColor(evt.color, 0.12),
              borderLeft: `3px solid ${evt.color}`,
              fontSize: `${Math.round(10 * scale)}px`,
            }}
            title={evt.raw.title}
          >
            <span className="font-medium" style={{ color: evt.color }}>
              {courseNames[evt.raw.courseId]?.slice(-3)} {evt.raw.title}
            </span>
          </button>
        ))}
        {events.length > 2 && (
          <div
            className="truncate text-text-500 bg-neutral-100 p-1 rounded-md text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setMoreOpen((v) => !v);
            }}
          >
            +{events.length - 2} more
          </div>
        )}
      </div>

      {/* More popup */}
      {moreOpen && (
        <div className="absolute z-50 mt-1 w-64 max-h-56 overflow-auto rounded-xl border border-black/10 bg-white shadow-lg p-2">
          <div className="mb-1 px-2 text-xs text-text-600">
            {date.toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <ul className="space-y-1">
            {events.map((evt) => (
              <li key={evt.__key}>
                <button
                  data-evt
                  onClick={() => {
                    onSelectEvent?.(evt.raw);
                    setMoreOpen(false);
                  }}
                  className="w-full truncate rounded-md px-2 py-1 text-left ring-1 ring-black/10 hover:bg-black/5"
                  style={{
                    backgroundColor: softColor(evt.color, 0.08),
                    borderLeft: `3px solid ${evt.color}`,
                  }}
                  title={evt.raw.title}
                >
                  <span className="font-medium" style={{ color: evt.color }}>
                    {evt.raw.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-end">
            <button
              data-evt
              className="px-2 py-1 text-xs rounded-md ring-1 ring-black/10 hover:bg-black/5"
              onClick={() => setMoreOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------- helpers -------------------------- */
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(d.getDate()).padStart(2, '0')}`;
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
function softColor(hex: string, alpha: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function mapEventsByDay(events: EventModel[]) {
  const map = new Map<string, any[]>();
  for (const raw of events || []) {
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
  return map;
}
