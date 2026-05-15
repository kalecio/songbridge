import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'songbridge.recentPlaylists';
const MAX_RECENT = 5;

const read = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore — quota or privacy mode
  }
};

/**
 * Tracks the IDs of the playlists the user has most recently played.
 * Persists to localStorage so the list survives reloads.
 */
export const usePlayHistory = () => {
  const [recentPlaylistIds, setRecentPlaylistIds] = useState<string[]>(() => read());

  // Re-read on cross-tab changes so a play recorded in one tab is reflected in
  // another. Same-tab updates are kept in state directly.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRecentPlaylistIds(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const recordPlaylistPlay = useCallback((id: string) => {
    if (!id) return;
    setRecentPlaylistIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      write(next);
      return next;
    });
  }, []);

  return { recentPlaylistIds, recordPlaylistPlay };
};

export const RECENT_PLAYLISTS_STORAGE_KEY = STORAGE_KEY;
export const RECENT_PLAYLISTS_MAX = MAX_RECENT;
