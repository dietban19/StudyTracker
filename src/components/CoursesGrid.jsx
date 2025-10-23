// src/components/CoursesGrid.jsx
import { useEffect, useState } from 'react';
import CourseCard from './CourseCard.jsx';
import { watchCoursesByTerm } from '../config/firebase/repositories.jsx';
import { updateCourse, deleteCourse } from '../config/firebase/courses.jsx';
export default function CoursesGrid({ uid, termId }) {
  const [courses, setCourses] = useState([]); // [{ id, name, color, ... }]

  useEffect(() => {
    const off = watchCoursesByTerm(uid, termId, (rows) => setCourses(rows));
    return () => off?.();
  }, [uid, termId]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <CourseCard
          key={c.id}
          id={c.id}
          title={c.name}
          color={c.color}
          onUpdate={async ({ title, color }) => {
            // optional optimistic update:
            // coursesSnap.setData?.(courses.map(it => it.id === c.id ? { ...it, name: title, color } : it));
            await updateCourse(uid, c.id, {
              name: title,
              color: color || null,
            });
          }}
          onDelete={async () => {
            // optional optimistic remove:
            // coursesSnap.setData?.(courses.filter(it => it.id !== c.id));
            await deleteCourse(uid, c.id);
            // onSnapshot will reconcile; if you used optimistic, it will just confirm it.
          }}
        />
      ))}
    </div>
  );
}
