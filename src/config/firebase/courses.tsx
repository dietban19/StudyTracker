// src/data/courses.ts
import {
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
export async function updateCourse(
  uid: string,
  courseId: string,
  patch: {
    name?: string | null;
    color?: string | null;
  },
) {
  const ref = doc(db, 'users', uid, 'courses', courseId);
  await updateDoc(ref, patch);
}

export async function deleteCourse(uid, courseId) {
  const ref = doc(db, 'users', uid, 'courses', courseId);
  await deleteDoc(ref);
}

/** ---------- Deadlines ---------- */

export type DeadlineType = 'assignment' | 'quiz' | 'exam' | 'project' | 'other';

export interface NewDeadline {
  title: string;
  type: DeadlineType;
  color: string;
  /** can be Date | ISO string | Firestore Timestamp (stored as Timestamp) */
  dueAt: Date | string | Timestamp;
}

function toTimestamp(v: Date | string | Timestamp): Timestamp {
  if (v instanceof Timestamp) return v;
  if (v instanceof Date) return Timestamp.fromDate(v);
  // assume ISO or parseable string
  return Timestamp.fromDate(new Date(v));
}

/**
 * Adds a deadline under: users/{uid}/courses/{courseId}/deadlines/{autoId}
 * Stores: title, type, color, dueAt (Timestamp), createdAt/updatedAt (serverTimestamp)
 * Returns the created document id.
 */
export async function addDeadline(
  uid: string,
  courseId: string,
  data: NewDeadline,
): Promise<string> {
  const colRef = collection(db, 'users', uid, 'deadlines');

  // normalize to local start-of-day so month views behave as date-only deadlines
  const d =
    data.dueAt instanceof Date
      ? new Date(
          data.dueAt.getFullYear(),
          data.dueAt.getMonth(),
          data.dueAt.getDate(),
        )
      : data.dueAt;
  const dueAt = toTimestamp(d);

  const docRef = await addDoc(colRef, {
    courseId, // 🔹 include courseId in the document
    title: data.title,
    type: data.type,
    color: data.color,
    dueAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** ---------- Tasks (To-do) ---------- */

export type TaskStatus = 'todo' | 'done';

export interface NewTask {
  courseId: string;
  title: string;
  status?: TaskStatus; // default: 'todo'
  color?: string | null; // optional UI accent per task
  dueAt?: Date | string | Timestamp | null; // optional; stored as Timestamp if provided
  deadlineId?: string | null;
}

/**
 * Adds a task under: users/{uid}/tasks/{autoId}
 * Stores: courseId, title, status, (optional) color, (optional) dueAt,
 *         createdAt/updatedAt (serverTimestamp)
 * Returns the created document id.
 */

export async function addTaskToList(
  uid: string,
  courseId: string,
  data: NewTask,
): Promise<string> {
  // users/{uid}/tasks
  const colRef = collection(db, 'users', uid, 'tasks');

  const dueAt: Timestamp | null =
    data.dueAt != null
      ? toTimestamp(data.dueAt as Date | string | Timestamp)
      : null;

  const docRef = await addDoc(colRef, {
    title: data.title,
    status: data.status ?? 'todo',
    color: data.color ?? null,
    courseId, // ← include course id on the task itself
    dueAt, // ← include due date (null if not provided)
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deadlineId: data.deadlineId,
  });

  return docRef.id;
}
export type TaskDoc = { id: string } & DocumentData;

function mapTaskDocs(
  snap: QuerySnapshot<DocumentData, DocumentData>,
): TaskDoc[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Listen to tasks for a single course.
 * Calls your callback whenever tasks change.
 * Returns an unsubscribe function.
 */
export function listenTasksForCourse(
  uid: string,
  courseId: string,
  cb: (items: TaskDoc[]) => void,
) {
  const ref = collection(db, 'users', uid, 'tasks');
  const qy = query(
    ref,
    where('courseId', '==', courseId),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(qy, (snap) => cb(mapTaskDocs(snap)));
}

export async function updateDeadline(
  uid: string,
  deadlineId: string,
  patch: {
    title?: string | null;
    color?: string | null;
    type?: DeadlineType | null;
    dueAt?: Date | string | Timestamp | null;
  },
) {
  console.log('updating deadline: ', uid, deadlineId, patch);
  const ref = doc(db, 'users', uid, 'deadlines', deadlineId);
  const updates: any = { updatedAt: serverTimestamp() };

  if ('title' in patch) updates.title = patch.title ?? null;
  if ('color' in patch) updates.color = patch.color ?? null;
  if ('type' in patch) updates.type = patch.type ?? null;

  if ('dueAt' in patch) {
    updates.dueAt =
      patch.dueAt == null ? null : toTimestamp(patch.dueAt as any);
  }

  await updateDoc(ref, updates);
}

export async function deleteDeadline(uid: string, deadlineId: string) {
  const ref = doc(db, 'users', uid, 'deadlines', deadlineId);
  await deleteDoc(ref);
}

/**
 * Fetch the course name for a given user and courseId.
 * @param uid user id
 * @param courseId course document id
 * @returns the course name (string) or null if not found
 */
export async function getCourseName(
  uid: string,
  courseId: string,
): Promise<string | null> {
  const ref = doc(db, 'users', uid, 'courses', courseId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null; // course not found
  }

  const data = snap.data();
  return (data?.name as string) ?? null;
}
