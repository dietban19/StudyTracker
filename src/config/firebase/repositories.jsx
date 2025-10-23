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

/** TERMS */
export async function listTerms(uid) {
  const snap = await getDocs(
    query(sub(uid, 'terms'), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function addTerm(uid, data) {
  return (
    await addDoc(sub(uid, 'terms'), { ...data, createdAt: serverTimestamp() })
  ).id;
}

/** COURSES */
export function watchCoursesByTerm(uid, termId, cb) {
  const q = termId
    ? query(sub(uid, 'courses'), where('termId', '==', termId))
    : sub(uid, 'courses');

  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => Course.fromJSON(d.id, d.data()));
    // client-side sort to avoid index requirement
    rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    cb(rows);
  });
}
export async function addCourse(uid, data) {
  return (
    await addDoc(sub(uid, 'courses'), { ...data, createdAt: serverTimestamp() })
  ).id;
}

/** TASKS */
export function watchTasksByCourseIds(uid, courseIds, cb) {
  // If you want term-wide stats, pass all courseIds for that term.
  // Firestore 'in' supports up to 30 values. If more, chunk it.
  let q;
  if (Array.isArray(courseIds) && courseIds.length) {
    q = query(sub(uid, 'tasks'), where('courseId', 'in', courseIds));
  } else {
    q = sub(uid, 'tasks');
  }
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
}
export async function addTask(uid, data) {
  return (
    await addDoc(sub(uid, 'tasks'), { ...data, createdAt: serverTimestamp() })
  ).id;
}

/** DEADLINES (optional for the dashboard list later) */
export function watchDeadlinesByCourse(uid, courseId, cb) {
  const q = query(
    sub(uid, 'deadlines'),
    where('courseId', '==', courseId),
    orderBy('dueAt'),
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
}

/** USERS (profile) */
export async function getUserDoc(uid) {
  const s = await getDoc(doc(db, `users/${uid}`));
  return s.exists() ? s.data() : null;
}
export async function upsertUser(uid, data) {
  await setDoc(
    doc(db, `users/${uid}`),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
