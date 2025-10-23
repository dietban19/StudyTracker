import { useEffect, useRef, useState } from 'react';
// If MonthCalendar is in a separate file:
import MonthCalendar from '../MonthCalendar';
import { useAuth } from '../../context/AuthContext';
import {
  addDeadline,
  deleteDeadline,
  updateDeadline,
} from '../../config/firebase/courses';
import DeadlineModal from './DeadlineModal';
import { useCourses } from '../../context/CoursesContext';
function withAlpha(color, alpha = 0.12) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color || '');
  if (!m) return color;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function CalendarModal({
  title,
  course,
  onClose,
  accentColor = '#2563EB',
}) {
  const ref = useRef(null);
  const [deadlineDate, setDeadlineDate] = useState(null);
  const [showDeadline, setShowDeadline] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const soft = withAlpha(accentColor, 0.12);
  const { user } = useAuth();
  const { deadlines, allDeadlines } = useCourses();

  const onUpdateEvent = async (e) => {
    console.log('UPDATING EVENT: ', e);
    const uid = user.uid;
    // normalize: month view treats dates as all-day; use start for dueAt
    const dueAt = e.start; // or pick end, your choice
    const color = e.color;
    if (e.kind === 'deadline') {
      await updateDeadline(uid, e.id, { title: e.title, dueAt, color });
    } else if (e.kind === 'task') {
      //   await updateTask(uid, e.id, { title: e.title, dueAt });
    } else {
      // Fallback: handle your other event types here
      console.warn('Unhandled event kind', e);
    }
  };

  const onDeleteEvent = async (e) => {
    const uid = user.uid;
    // optional local/optimistic removal

    setAllEvents((prev) => prev.filter((x) => x.id !== e.id));

    if (e.kind === 'deadline') {
      await deleteDeadline(uid, e.id);
    } else if (e.kind === 'task') {
      // await deleteTask(uid, e.id);
    } else {
      console.warn('Unhandled delete for kind', e);
    }
  };
  useEffect(() => {
    console.log('COURSE: ', course);
    if (!Array.isArray(allDeadlines)) return;

    // `allDeadlines` are instances of Deadline (preferred path),
    // but also support plain objects just in case.
    const next = allDeadlines
      .filter(
        (d) =>
          typeof d.getCourseId === 'function'
            ? d.getCourseId() === course.id
            : d.courseId === course.id, // fallback for plain objects
      )
      .map((d) => (typeof d.getEvent === 'function' ? d.getEvent() : d.event))
      .filter(Boolean)
      .map((evt) => ({
        ...evt,
        // Ensure `start` is a Date for MonthCalendar
        start: evt.start instanceof Date ? evt.start : new Date(evt.start),
      }));
    setAllEvents(next);
  }, [allDeadlines]);
  useEffect(() => {
    if (showDeadline) return;
    function onKey(e) {
      if (e.key === 'Escape') {
        if (showDeadline) setShowDeadline(false);
        else onClose?.();
      }
    }
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [showDeadline, onClose]);
  const saveDeadline = async (payload) => {
    const uid = user.uid;
    const courseId = course.id;
    await addDeadline(uid, courseId, {
      title: payload.title,
      type: payload.type,
      color: payload.color,
      dueAt: payload.date, // Date OK; data layer normalizes to Timestamp
    });
  };
  const today = new Date();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onPointerDown={() => {
          if (!showDeadline) {
            onClose();
          }
        }}
      />
      <div
        ref={ref}
        className="relative z-10 w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10"
        style={{ borderTop: `6px solid ${accentColor}` }}
      >
        {/* Modal header */}
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-md"
            style={{
              backgroundColor: soft,
              border: `2px solid ${accentColor}`,
            }}
            aria-hidden
          />
          <h3 id="calendar-modal-title" className="text-lg font-semibold">
            {title}
          </h3>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-text-600 hover:bg-black/5"
              aria-label="Close calendar"
            >
              ✕
            </button>
          </div>
        </div>

        <MonthCalendar
          weekStartsOn={0}
          events={allEvents}
          onSelectDate={(d) => {
            setDeadlineDate(d);
            setShowDeadline(true);
          }}
          onSelectEvent={(evt) => {
            // handle select
          }}
          onCreateEvent={(d) => {
            setDeadlineDate(d);
            setShowDeadline(true);
          }}
          onNavigate={(d) => {
            console.log('Navigated to', d);
          }}
          onUpdateEvent={onUpdateEvent}
          onDeleteEvent={onDeleteEvent}
        />
      </div>
      {showDeadline && (
        <DeadlineModal
          date={deadlineDate}
          accentColor={accentColor}
          onClose={() => setShowDeadline(false)}
          onSave={(payload) => {
            saveDeadline(payload);
            setShowDeadline(false);
          }}
          course={course}
        />
      )}
    </div>
  );
}
