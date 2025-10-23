import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import type { Event as EventModel } from '../domain/models/Event';
import { Pencil } from 'lucide-react';
import EventDetailsModal from './Calendar/EventDetailsModal';
import { useAuth } from '../context/AuthContext';
import { getCourseName } from '../config/firebase/courses';
/**
 * MonthCalendar — responsive container-aware month view
 * ----------------------------------------------------
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
}: {
  initialDate?: Date | string;
  weekStartsOn?: 0 | 1;
  events?: EventModel[];
  onNavigate?: (d: Date) => void;
  onSelectDate?: (d: Date) => void;
  onSelectEvent?: (e: EventModel) => void;
  onCreateEvent?: (d: Date) => void;
  onUpdateEvent?: (e: EventModel) => void | Promise<void>; // ✅ add this
  onDeleteEvent?: (e: EventModel) => void | Promise<void>;
  isAll?: false;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  // NEW: local modal state for an opened event
  const [openEvent, setOpenEvent] = useState<EventModel | null>(null);

  // watch container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w =
          // @ts-ignore
          entry.contentBoxSize?.[0]?.inlineSize ??
          // @ts-ignore
          entry.contentBoxSize?.inlineSize ??
          entry.contentRect.width;
        if (typeof w === 'number') setContainerWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // derive scaling from width (nice defaults if unknown)
  const w = containerWidth ?? 900; // fallback for SSR/first paint
  const colW = w / 7;
  const cellH = Math.round(clamp(colW * 0.78, 88, 180));
  const scale = clamp(w / 900, 0.9, 1.15);

  const [cursor, setCursor] = useState(() =>
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

  function goToMonth(offset: number) {
    const next = new Date(firstOfMonth);
    next.setMonth(next.getMonth() + offset);
    setCursor(next);
    onNavigate?.(next);
  }

  function goToday() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), 1);
    setCursor(next);
    onNavigate?.(next);
  }

  const title = firstOfMonth.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const weekDayLabels = getWeekdayLabels(weekStartsOn);

  // open modal when a day-cell event is clicked; also call external handler
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
      className="w-full rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden md:overflow-hidden overflow-x-auto"
      style={
        {
          '--mc-cell-h': `${cellH}px`,
          '--mc-pad': `${Math.round(12 * scale)}px`,
          '--mc-pad-sm': `${Math.round(8 * scale)}px`,
          '--mc-fs-base': `${Math.round(14 * scale)}px`,
          '--mc-fs-sm': `${Math.round(12 * scale)}px`,
          '--mc-fs-xs': `${Math.round(11 * scale)}px`,
        } as React.CSSProperties
      }
    >
      {/* Inner width guard so calendar doesn't squish on narrow phones */}
      <div className="min-w-[650px] sm:min-w-0">
        {/* Header */}
        <div
          className="flex flex-wrap items-center gap-2 border-b border-black/10"
          style={{ padding: 'var(--mc-pad)' }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-black/10 hover:bg-black/5"
              style={{ fontSize: 'var(--mc-fs-sm)' }}
            >
              Today
            </button>
            <div className="flex items-center">
              <button
                onClick={() => goToMonth(-1)}
                aria-label="Previous month"
                className="rounded-l-lg px-3 py-2 ring-1 ring-black/10 hover:bg-black/5"
                style={{ fontSize: 'var(--mc-fs-base)' }}
              >
                ‹
              </button>
              <button
                onClick={() => goToMonth(1)}
                aria-label="Next month"
                className="rounded-r-lg px-3 py-2 ring-1 ring-l-0 ring-black/10 hover:bg-black/5"
                style={{ fontSize: 'var(--mc-fs-base)' }}
              >
                ›
              </button>
            </div>
          </div>
          <h2
            className="ml-2 text-base sm:text-lg font-semibold text-text-900"
            style={{ fontSize: `${Math.round(18 * scale)}px` }}
          >
            {title}
          </h2>
          <div
            className="ml-auto text-[11px] sm:text-xs text-text-500"
            style={{ fontSize: 'var(--mc-fs-xs)' }}
          >
            Month view
          </div>
        </div>

        {/* Week headers */}
        <div
          className="grid grid-cols-7 border-b border-black/10 bg-black/5 text-[11px] sm:text-xs font-medium text-text-600"
          style={{ fontSize: 'var(--mc-fs-xs)' }}
        >
          {weekDayLabels.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center uppercase tracking-wide"
              style={{ padding: 'var(--mc-pad-sm)' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid (6 rows × 7 cols) */}
        <div
          className="grid grid-cols-7"
          style={{ gridTemplateRows: `repeat(6, var(--mc-cell-h))` }}
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

      {/* Event details modal */}
      {openEvent && (
        <EventDetailsModal
          event={openEvent}
          onClose={() => setOpenEvent(null)}
          onSave={onUpdateEvent}
          onDelete={onDeleteEvent} // <— NEW
        />
      )}
    </div>
  );
}

function DayCell({
  date,
  isCurrentMonth,
  isToday,
  events,
  onSelectDate,
  onSelectEvent,
  onCreateEvent,
  scale = 1,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: {
    __key: string;
    color: string;
    raw: EventModel;
    span: number;
  }[];
  onSelectDate?: (d: Date) => void;
  onSelectEvent?: (e: EventModel) => void;
  onCreateEvent?: (d: Date) => void;
  scale?: number;
}) {
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtnRef = useRef<HTMLDivElement | null>(null);
  const moreModalRef = useRef<HTMLDivElement | null>(null);
  const [courseNames, setCourseNames] = useState<Record<string, string | null>>(
    {},
  );
  const uid = user?.uid;
  useEffect(() => {
    async function fetchNames() {
      const map: Record<string, string | null> = {};
      for (const evt of events) {
        const courseId = evt.raw.courseId;
        if (courseId && !(courseId in map)) {
          map[courseId] = await getCourseName(uid, courseId);
        }
      }
      setCourseNames(map);
    }
    if (events.length) {
      fetchNames();
    }
  }, [events, uid]);
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        moreModalRef.current?.contains(t) ||
        moreBtnRef.current?.contains(t)
      ) {
        return;
      }
      setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [moreOpen]);

  const displayNum = date.getDate();
  return (
    <div
      className={[
        'hover:bg-neutral-100/50 cursor-pointer border-b border-r border-black/10 p-1 relative',
        !isCurrentMonth ? 'bg-black/2 text-black/50' : 'bg-white',
      ].join(' ')}
      style={{ padding: `${Math.round(4 * scale)}px` }}
      onDoubleClick={() => onCreateEvent?.(date)}
      onClick={(e) => {
        if (e.target instanceof HTMLElement && e.target.closest('[data-evt]'))
          return;
        onSelectDate?.(date);
      }}
      role="gridcell"
      aria-selected={isToday}
    >
      {/* Corner date indicator */}
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
          <span
            className="inline-flex items-center rounded-full bg-blue-600 text-white font-semibold"
            style={{
              fontSize: `${Math.round(10 * scale)}px`,
              padding: `${Math.round(2 * scale)}px ${Math.round(6 * scale)}px`,
            }}
          >
            Today
          </span>
        )}
      </div>

      {/* Events list */}
      <div
        className="mt-1 space-y-1"
        style={{ marginTop: `${Math.round(4 * scale)}px` }}
      >
        {events.slice(0, 3).map((evt, evtInd) => {
          const courseId = evt.raw.courseId;
          if (evtInd >= 1) return;
          return (
            <button
              key={evt.__key}
              data-evt
              onClick={() => {
                console.log('EVENT INDESX', evtInd);
                onSelectEvent?.(evt.raw);
              }}
              className="group w-full truncate rounded-md px-2 py-1 text-left text-xs ring-1 ring-black/10 hover:ring-black/20"
              style={{
                backgroundColor: softColor(evt.color, 0.12),
                borderLeft: `3px solid ${evt.color}`,
                fontSize: `${Math.round(8 * scale)}px`,
                padding: `${Math.round(4 * scale)}px ${Math.round(
                  6 * scale,
                )}px`,
              }}
              title={evt.raw.title}
            >
              <span className="font-medium" style={{ color: evt.color }}>
                {evt.raw.courseId && courseNames[evt.raw.courseId]?.slice(-3)}{' '}
                {evt.raw.title}
              </span>
              {evt.span > 1 && (
                <span
                  className="ml-1 text-text-500"
                  style={{ fontSize: `${Math.round(10 * scale)}px` }}
                >
                  (×{evt.span}d)
                </span>
              )}
            </button>
          );
        })}
        {events.length > 1 && (
          <div className="relative inline-block">
            <div
              ref={moreBtnRef}
              data-evt
              role="button"
              tabIndex={0}
              className="truncate text-text-500 bg-neutral-100 p-1 rounded-lg hover:bg-neutral-200 duration-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); // ⛔ prevent day cell click (no new deadline modal)
                setMoreOpen((v) => !v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setMoreOpen((v) => !v);
                }
              }}
              style={{ fontSize: `${Math.round(11 * scale)}px` }}
            >
              +{events.length - 1} more
            </div>

            {moreOpen && (
              <div
                ref={moreModalRef}
                data-evt
                role="dialog"
                aria-label="All events for this day"
                className="absolute z-50 mt-1 w-64 sm:w-72 max-h-56 sm:max-h-64 overflow-auto rounded-xl border border-black/10 bg-white shadow-lg p-2"
                style={{
                  left: 0,
                  top: '100%',
                  fontSize: `${Math.round(12 * scale)}px`,
                }}
                onClick={(e) => {
                  // keep clicks inside from bubbling to the day cell
                  e.stopPropagation();
                }}
              >
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
                        <span
                          className="font-medium"
                          style={{ color: evt.color }}
                        >
                          {evt.raw.title}
                        </span>
                        {evt.span > 1 && (
                          <span className="ml-1 text-text-500 text-xs">
                            (×{evt.span}d)
                          </span>
                        )}
                        {/* Optional: show time if you have it on evt.raw */}
                        {(evt.raw as any)?.start && (evt.raw as any)?.end && (
                          <span className="ml-2 text-text-500 text-xs">
                            {new Date(
                              (evt.raw as any).start,
                            ).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            –{' '}
                            {new Date((evt.raw as any).end).toLocaleTimeString(
                              [],
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              },
                            )}
                          </span>
                        )}
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
        )}
      </div>
    </div>
  );
}

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
