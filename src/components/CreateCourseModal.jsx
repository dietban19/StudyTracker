import { useState } from 'react';
import { addCourse } from '../config/firebase/repositories';
import { Course } from '../domain/models/Course';
export default function CreateCourseModal({ uid, termId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!uid || !termId || !name.trim()) return;

    try {
      setLoading(true);
      setErr('');
      const courseData = {
        name: name.trim(),
        termId,
        code: code || null,
        color: color || null,
      };

      // save to Firestore
      const id = await addCourse(uid, courseData);

      // wrap in Course class
      const newCourse = Course.fromJSON(id, courseData);

      // pass up
      onCreated?.(newCourse);
      onClose();
    } catch (e) {
      setErr(e?.message || 'Failed to create course.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-gray-800">Create Course</h2>
        <p className="text-sm text-gray-500">
          Add details for your new course. Courses belong to the current term.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Course name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Computer Science 101"
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Code (optional)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., CS101"
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Color
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1 h-10 w-16 cursor-pointer rounded border p-1"
            />
          </div>

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create Course'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
