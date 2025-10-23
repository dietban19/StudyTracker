import { useState } from 'react';

import { addTerm } from '../config/firebase/repositories';
import { Term } from '../domain/models/Term';
/** Empty state that explains what a "Term" is and lets the user create one.
 *  Props:
 *    - uid: string (current user's uid)
 *    - onCreated?: (term: { id, name, archived, startDate?, endDate? }) => void
 */
export default function CreateTerm({ uid, onCreated }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const canSubmit = name.trim().length > 0 && !loading;

  async function handleCreate(e) {
    e.preventDefault();
    if (!uid || !canSubmit) return;
    try {
      setLoading(true);
      setErr('');
      const termData = {
        name: name.trim(),
        archived: false,
        startDate: startDate || null,
        endDate: endDate || null,
      };
      const id = await addTerm(uid, termData);
      const newTerm = Term.fromJSON(id, termData);
      onCreated?.(newTerm);
      // reset minimal fields after success
      setName('');
      setStartDate('');
      setEndDate('');
    } catch (e) {
      setErr(e?.message || 'Failed to create term.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 shadow-sm">
        {/* Icon + heading */}
        <div className="flex items-center gap-3">
          {/* mortarboard icon (inline SVG so no extra deps) */}
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-indigo-600"
              fill="currentColor"
            >
              <path d="M12 3 1.5 8.25 12 13.5 22.5 8.25 12 3ZM4.5 12v4.5c0 1.657 3.358 3 7.5 3s7.5-1.343 7.5-3V12l-7.5 3.75L4.5 12Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              You don’t have any terms yet
            </h2>
            <p className="text-sm text-gray-600">
              A <span className="font-medium">Term</span> groups your courses
              and deadlines (e.g., <em>Fall 2025</em>, <em>Spring Semester</em>,
              or <em>Exam Prep</em>). Create one to keep your dashboard focused.
            </p>
          </div>
        </div>

        {/* Tips */}
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          <li>
            • Use clear names like{' '}
            <span className="font-medium">“Fall 2025”</span> or{' '}
            <span className="font-medium">“Summer Session”</span>.
          </li>
          <li>• You can archive old terms later to keep things tidy.</li>
          <li>
            • Courses and tasks will automatically belong to the selected term.
          </li>
        </ul>

        {/* Form */}
        <form onSubmit={handleCreate} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">
                Term name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Fall 2025"
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start date (optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                End date (optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`rounded-xl px-4 py-2 text-white ${
                canSubmit
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? 'Creating…' : 'Create Term'}
            </button>
            <span className="text-xs text-gray-500">
              You can change or archive it later.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
