import { useCallback, useState } from 'react';

const STORAGE_KEY = 'colorwheel-owned-paints';

function loadOwnedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function useOwnedPaints() {
  const [ownedIds, setOwnedIds] = useState<Set<string>>(loadOwnedIds);

  const toggleOwned = useCallback((paintId: string) => {
    setOwnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(paintId)) next.delete(paintId);
      else next.add(paintId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { ownedIds, toggleOwned };
}
