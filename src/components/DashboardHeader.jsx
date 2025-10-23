import { useState, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Term } from '../domain/models/Term';
import { addTerm, listTerms } from '../config/firebase/repositories';

export default function DashboardHeader({ uid, term, setTerm, onAddCourse }) {
  const [open, setOpen] = useState(false);
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const t = await listTerms(uid);
      setTerms(t.map((doc) => Term.fromJSON(doc.id, doc)));
    })();
  }, [uid]);

  async function handleAddTerm() {
    const name = prompt('Enter term name (e.g., Fall 2025):');
    if (!name) return;
    const termData = { name, archived: false };
    const id = await addTerm(uid, termData);
    const newTerm = Term.fromJSON(id, termData);
    setTerms((prev) => [newTerm, ...prev]);
    setTerm(newTerm);
    setOpen(false);
  }

  return (
    <div className="flex items-center justify-between relative">
      <div className="flex gap-1 items-center relative">
        <h2 className="text-xl font-semibold text-text-900">
          {term?.name || 'Current Term'}
        </h2>
        <button
          onClick={() => setOpen(!open)}
          className="ml-1 p-1 rounded hover:bg-muted"
        >
          <ChevronDown
            className={`h-5 w-5 text-text-600 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-8 left-0 mt-1 w-56 rounded-lg border border-border bg-surface shadow-lg z-50">
            <div className="max-h-60 overflow-y-auto">
              {terms.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTerm(t);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-muted ${
                    term?.id === t.id
                      ? 'font-semibold text-primary-600'
                      : 'text-text-700'
                  }`}
                >
                  {t.name}
                </button>
              ))}
              {!terms.length && (
                <div className="px-4 py-2 text-sm text-text-500">
                  No terms yet
                </div>
              )}
            </div>

            <div className="border-t my-1 border-border" />

            <button
              onClick={handleAddTerm}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-primary-600 hover:bg-muted font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Term
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onAddCourse}
        className="px-3 py-1 rounded bg-primary-500 hover:bg-primary-600 text-white text-sm"
      >
        + Add Course
      </button>
    </div>
  );
}
