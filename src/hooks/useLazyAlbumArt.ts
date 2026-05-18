import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Module-level cache so once an image is fetched it survives across remounts
// and component instances within the session. `null` means we already tried
// and the file has no embedded art (so we don't keep retrying).
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

/** Replace the cached art for `path`. Causes mounted hook instances to re-render. */
export function updateCachedArt(path: string, dataUrl: string | null): void {
  cache.set(path, dataUrl);
}

/** Remove the cached art for `path` so the next hook mount fetches fresh from disk. */
export function invalidateCachedArt(path: string): void {
  cache.delete(path);
  inflight.delete(path);
}

const fetchArt = (path: string): Promise<string | null> => {
  const existing = inflight.get(path);
  if (existing) return existing;

  const promise = invoke<string | null>('get_track_image', { path })
    .then((img) => {
      const value = typeof img === 'string' && img.length > 0 ? img : null;
      cache.set(path, value);
      inflight.delete(path);
      return value;
    })
    .catch(() => {
      cache.set(path, null);
      inflight.delete(path);
      return null;
    });
  inflight.set(path, promise);
  return promise;
};

/**
 * Returns an album-art data URL for the given track path. If `eager` is
 * provided (e.g. from a freshly-scanned track that already has art), it is
 * returned immediately without a roundtrip. Otherwise the art is fetched
 * lazily via the `get_track_image` Tauri command and cached for reuse.
 */
export const useLazyAlbumArt = (path?: string, eager?: string): string | undefined => {
  const initial = eager ?? (path ? (cache.get(path) ?? undefined) : undefined) ?? undefined;
  const [art, setArt] = useState<string | undefined>(initial);

  useEffect(() => {
    if (eager) {
      setArt(eager);
      return;
    }
    if (!path) {
      setArt(undefined);
      return;
    }

    const cached = cache.get(path);
    if (cached !== undefined) {
      setArt(cached ?? undefined);
      return;
    }

    let cancelled = false;
    fetchArt(path).then((img) => {
      if (!cancelled) setArt(img ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [path, eager]);

  return art;
};
