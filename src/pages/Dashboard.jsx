import { useEffect, useMemo, useState } from 'react';
import CourseCard from '../components/CourseCard';
import StatCard from '../components/StatCode';
import { useAuth } from '../context/AuthContext';
import {
  addCourse,
  listTerms,
  watchCoursesByTerm,
  watchTasksByCourseIds,
} from '../config/firebase/repositories';
import useSnapshot from '../hooks/useSnapshot';
import CreateTerm from '../components/CreateTerm';
import { Term } from '../domain/models/Term';
import CreateCourseModal from '../components/CreateCourseModal';
import DashboardHeader from '../components/DashboardHeader';
import CoursesGrid from '../components/CoursesGrid';
import { Skeleton } from '../components/Skeleton';
import MonthCalendar from '../components/MonthCalendar';
import {
  watchDeadlinesByCourseIds,
  watchToDoListByCourseIds,
} from '../config/firebase/repos';
import { useCourses } from '../context/CoursesContext';
import AuthPage from './AuthPage';
import TasksList from '../components/TasksList';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { deadlines, allDeadlines } = useCourses();
  const uid = user?.uid;
  const [term, setTerm] = useState(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [openStat, setOpenStat] = useState('');
  const { tasks } = useCourses();
  const [allEvents, setAllEvents] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false); // NEW: controls calendar overlay

  useEffect(() => {
    if (!uid) return;
    setTermsLoading(true);
    (async () => {
      try {
        const terms = await listTerms(uid);
        const active = terms.find((t) => !t.archived) || terms[0] || null;
        setTerm(active);
      } finally {
        setTimeout(() => setTermsLoading(false), 0);
      }
    })();
  }, [uid]);

  const coursesSnap = useSnapshot(
    term && uid ? (cb) => watchCoursesByTerm(uid, term.id, cb) : null,
    [uid, term?.id],
  );
  const courses = coursesSnap.data || [];
  const courseIds = useMemo(
    () => courses.map((c) => c.id).slice(0, 30),
    [courses],
  );
  const tasksSnap = useSnapshot(
    uid ? (cb) => watchTasksByCourseIds(uid, courseIds, cb) : null,
    [uid, JSON.stringify(courseIds)],
  );

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
        if (t.dueAt && new Date(t.dueAt).getTime() < now) o++;
      }
    }
    return { pending: p, overdue: o, completed: d };
  }, [tasks]);

  useEffect(() => {
    if (!Array.isArray(allDeadlines)) return;
    const next = allDeadlines
      .map((d) => (typeof d.getEvent === 'function' ? d.getEvent() : d.event))
      .filter(Boolean)
      .map((evt) => ({
        ...evt,
        start: evt.start instanceof Date ? evt.start : new Date(evt.start),
      }));
    setAllEvents(next);
  }, [allDeadlines]);

  const onAddCourse = async () => {
    if (!uid || !term) return;
    const name = prompt('Course name?');
    if (!name) return;
    await addCourse(uid, { name, termId: term.id });
  };

  function handleCourseCreated(course) {
    console.log('New course created:', course);
  }

  const items = useMemo(() => {
    const list = (tasks || []).filter((t) => t.courseId != '');
    const ts = (x) => x?.updatedAt?.seconds ?? x?.createdAt?.seconds ?? 0;
    return list.sort((a, b) => ts(b) - ts(a));
  }, [tasks]);

  if (termsLoading || loading) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <section>
          <h3 className="font-medium mb-3 text-text-900">My Courses</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </section>
      </div>
    );
  }

  if (!uid) return <AuthPage />;
  if (!term) return <CreateTerm uid={uid} onCreated={(t) => setTerm(t)} />;

  return (
    <div className="relative p-6 space-y-6 bg-background min-h-screen">
      <DashboardHeader
        uid={uid}
        term={term}
        setTerm={setTerm}
        onAddCourse={() => setShowCourseModal(true)}
      />

      {/* Courses */}
      <section>
        <h3 className="font-medium mb-3 text-text-900">My Courses</h3>
        {!term ? (
          <div className="text-text-500">Loading courses…</div>
        ) : (
          <CoursesGrid uid={uid} termId={term.id} />
        )}
      </section>

      {/* Tasks summary */}
      <section>
        <h3 className="font-medium mb-3 text-text-900">Tasks</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Pending"
            value={pending}
            onClick={() => setOpenStat('pending')}
          />
          <StatCard label="Overdue" value={overdue} highlight />
          <StatCard label="Completed" value={completed} />
        </div>
      </section>

      {/* Calendar button */}
      <div className="pt-4">
        <button
          onClick={() => setShowCalendar(true)}
          className="w-full sm:w-auto rounded-xl bg-[var(--color-text-900)] text-white px-5 py-3 font-medium text-sm sm:text-base hover:opacity-90 transition"
        >
          Open Calendar
        </button>
      </div>

      {/* Calendar Overlay */}
      {showCalendar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col">
          <div className="bg-[var(--color-surface)] flex-1 overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-900)]">
                Calendar
              </h2>
              <button
                onClick={() => setShowCalendar(false)}
                className="rounded-md px-3 py-1 text-sm text-[var(--color-text-700)] hover:bg-[var(--color-muted)] transition"
              >
                Close
              </button>
            </div>
            <div className="">
              <MonthCalendar
                initialDate={new Date()}
                weekStartsOn={0}
                events={allEvents}
                onNavigate={(date) => console.log('Month changed to:', date)}
                onSelectDate={(date) => console.log('Clicked date:', date)}
                onCreateEvent={(date) => console.log('Create event on:', date)}
                onSelectEvent={(evt) => console.log('Clicked event:', evt)}
                isAll={true}
              />
            </div>
          </div>
        </div>
      )}

      {showCourseModal && (
        <CreateCourseModal
          uid={uid}
          termId={term.id}
          onClose={() => setShowCourseModal(false)}
          onCreated={handleCourseCreated}
        />
      )}

      {openStat === 'pending' && (
        <TasksList setOpenStat={setOpenStat} items={items} />
      )}
    </div>
  );
}
