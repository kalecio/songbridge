import { useEffect, useState } from 'react';

const key = 'songbridge.recentTracks';
export function useRecentTracks(path?: string) {
  const [paths, setPaths] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (!path) return;
    setPaths((previous) => {
      const next = [path, ...previous.filter((item) => item !== path)].slice(0, 50);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Storage may be unavailable. */
      }
      return next;
    });
  }, [path]);
  return paths;
}
