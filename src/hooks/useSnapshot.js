import { useEffect, useState } from 'react';

/**
 * Pass a function that returns an unsubscribe: () => void
 * Example: () => watchCoursesByTerm(uid, termId, setData)
 */
export default function useSnapshot(watchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!watchFn) return;
    setLoading(true);
    const unsub = watchFn((rows) => {
      setData(rows);
      setLoading(false);
    });
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}
