import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Course } from '../../domain/models/Course';
/** Helpers */
const sub = (uid, coll) => collection(db, `users/${uid}/${coll}`);
const docRef = (uid, coll, id) => doc(db, `users/${uid}/${coll}/${id}`);
/** DEADLINES — all (user-wide) */
export function watchAllDeadlines(
  uid: string,
  cb: (rows: any[]) => void,
): Unsubscribe {
  const qy = query(
    collection(db, `users/${uid}/deadlines`),
    orderBy('dueAt', 'asc'),
  );
  const latest: Record<string, any> = {};
  return onSnapshot(qy, (snap) => {
    for (const ch of snap.docChanges()) {
      const id = ch.doc.id;
      if (ch.type === 'removed') {
        delete latest[id];
      } else {
        latest[id] = { id, ...ch.doc.data() };
      }
    }
    cb(sortByDueAt(Object.values(latest)));
  });
}
function sortByDueAt(rows: any[]) {
  return rows.sort((a, b) => {
    const da = normalizeDueAt(a?.dueAt);
    const db = normalizeDueAt(b?.dueAt);
    return da - db;
  });
}
function normalizeDueAt(v: any): number {
  // Supports Firestore Timestamp, Date, ISO string, or millis
  if (!v) return 0;
  // Firestore Timestamp has toDate()
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  const n = typeof v === 'string' ? Date.parse(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** DEADLINES — by many course IDs (term-wide) */
export function watchDeadlinesByCourseIds(
  uid: string,
  courseIds: string[],
  cb: (rows: any[]) => void,
) {
  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    // No filter: watch everything
    return watchAllDeadlines(uid, cb);
  }
  const CHUNK = 30;
  const chunks: string[][] = [];
  for (let i = 0; i < courseIds.length; i += CHUNK) {
    chunks.push(courseIds.slice(i, i + CHUNK));
  }

  // Keep one unsubscribe per chunk, merge client-side
  let latest: Record<string, any> = {};
  const unsubs = courseIds.map((courseId) => {
    const qy = query(
      collection(db, `users/${uid}/courses/${courseId}/deadlines`),
      orderBy('dueAt', 'asc'),
    );
    return onSnapshot(qy, (snap) => {
      // Use fully-qualified key to avoid id clashes across courses if needed
      for (const d of snap.docs) {
        latest[d.id] = { id: d.id, courseId, ...d.data() };
      }

      // Already ordered per-course; re-sort globally by dueAt
      const merged = Object.values(latest).sort((a: any, b: any) => {
        const da = a.dueAt ? new Date(a.dueAt).getTime() : 0;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : 0;
        return da - db;
      });
      cb(merged);
    });
  });

  // Return a composite unsubscribe
  return () => unsubs.forEach((u) => u && u());
}

export function watchToDoListByCourseIds(
  uid: string,
  courseIds: string[],
  cb: (rows: any[]) => void,
) {
  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    // No filter: watch everything
    return watchAllDeadlines(uid, cb);
  }
  const CHUNK = 30;
  const chunks: string[][] = [];
  for (let i = 0; i < courseIds.length; i += CHUNK) {
    chunks.push(courseIds.slice(i, i + CHUNK));
  }

  // Keep one unsubscribe per chunk, merge client-side
  let latest: Record<string, any> = {};
  const unsubs = courseIds.map((courseId) => {
    const qy = query(
      collection(db, `users/${uid}/courses/${courseId}/tasks`),
      //   orderBy('dueAt', 'asc'),
    );
    console.log('TODO');
    return onSnapshot(qy, (snap) => {
      // Use fully-qualified key to avoid id clashes across courses if needed
      for (const d of snap.docs) {
        latest[d.id] = { id: d.id, courseId, ...d.data() };
      }
      for (const d of snap.docs) {
        console.log(d.data());
      }
      // Already ordered per-course; re-sort globally by dueAt
      const merged = Object.values(latest).sort((a: any, b: any) => {
        const da = a.dueAt ? new Date(a.dueAt).getTime() : 0;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : 0;
        return da - db;
      });
      cb(merged);
    });
  });

  // Return a composite unsubscribe
  return () => unsubs.forEach((u) => u && u());
}
