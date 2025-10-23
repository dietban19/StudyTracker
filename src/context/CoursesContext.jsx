import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useSnapshot from '../hooks/useSnapshot';
import {
  listTerms,
  watchCoursesByTerm,
  watchTasksByCourseIds,
  // ⬇️ add this in your repositories (same signature as watchTasksByCourseIds)
} from '../config/firebase/repositories';
import {
  watchAllDeadlines,
  watchDeadlinesByCourseIds,
} from '../config/firebase/repos';
import { Deadline } from '../domain/models/Deadline';
const CoursesContext = createContext(undefined);

// Normalize any Firestore/JSON/Date/ISO to millis
function toMillisAny(dueAt) {
  if (!dueAt) return NaN;
  // Firestore Timestamp
  if (typeof dueAt?.toDate === 'function')
    return dueAt.toDate().getTime?.() ?? NaN;
  // JSON {seconds, nanoseconds}
  if (typeof dueAt?.seconds === 'number') {
    return (
      dueAt.seconds * 1000 + (dueAt.nanoseconds ? dueAt.nanoseconds / 1e6 : 0)
    );
  }
  // Date or ISO/number
  const t = new Date(dueAt).getTime();
  return Number.isNaN(t) ? NaN : t;
}

export function CoursesProvider({ uid, children }) {
  const [term, setTerm] = useState(null);
  const [termsLoading, setTermsLoading] = useState(false);

  // Load terms and pick active
  useEffect(() => {
    if (!uid) return;
    setTermsLoading(true);
    (async () => {
      try {
        const terms = await listTerms(uid);
        const active = terms.find((t) => !t.archived) || terms[0] || null;
        setTerm(active);
      } finally {
        setTermsLoading(false);
      }
    })();
  }, [uid]);

  // Courses for active term
  const coursesSnap = useSnapshot(
    term && uid ? (cb) => watchCoursesByTerm(uid, term.id, cb) : null,
    [uid, term?.id],
  );
  const courses = coursesSnap.data || [];

  const courseIds = useMemo(
    () => courses.map((c) => c.id).slice(0, 30),
    [courses],
  );

  // Tasks for current courses
  const tasksSnap = useSnapshot(
    uid && courseIds.length
      ? (cb) => watchTasksByCourseIds(uid, courseIds, cb)
      : null,
    [uid, courseIds.join('|')],
  );
  const tasks = tasksSnap.data || [];
  const allDeadlinesSnap = useSnapshot(
    uid ? (cb) => watchAllDeadlines(uid, cb) : null,
    [uid],
  );
  const rawAllDeadlines = allDeadlinesSnap.data || [];
  const allDeadlines = rawAllDeadlines.map((doc) => new Deadline(doc));

  // Deadlines for current courses (same shape as tasks, just a different collection/source)
  const deadlinesSnap = useSnapshot(
    uid && courseIds.length
      ? (cb) => watchDeadlinesByCourseIds(uid, courseIds, cb)
      : null,
    [uid, courseIds.join('|')], // same deps as tasks
  );
  const rawDeadlines = deadlinesSnap.data || [];
  const deadlines = rawDeadlines.map((doc) => new Deadline(doc));

  // Derived stats for tasks
  const { pending, overdue, completed } = useMemo(() => {
    const now = Date.now();
    let p = 0,
      o = 0,
      d = 0;
    for (const t of tasks) {
      const status = t.status || 'todo';
      if (status === 'done') d++;
      else {
        p++;
        const due = toMillisAny(t.dueAt);
        if (!Number.isNaN(due) && due < now) o++;
      }
    }
    return { pending: p, overdue: o, completed: d };
  }, [tasks]);

  // Optional: derived stats for deadlines (mirrors tasks logic)
  const deadlinesStats = useMemo(() => {
    const now = Date.now();
    let total = deadlines.length;
    let overdue = 0;
    for (const d of deadlines) {
      const due = toMillisAny(d.dueAt);
      if (!Number.isNaN(due) && due < now) overdue++;
    }
    return { total, overdue };
  }, [deadlines]);

  const value = useMemo(
    () => ({
      uid,
      term,
      setTerm,
      termsLoading,
      courses,
      courseIds,
      tasks,
      deadlines, // ⬅️ exposed here
      pending,
      overdue,
      completed,
      deadlinesStats, // ⬅️ optional handy stats
      allDeadlines,
    }),
    [
      uid,
      term,
      termsLoading,
      courses,
      courseIds,
      tasks,
      deadlines,
      pending,
      overdue,
      completed,
      deadlinesStats,
      allDeadlines,
    ],
  );

  return (
    <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>
  );
}

export function useCourses() {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error('useCourses must be used inside CoursesProvider');
  return ctx;
}
