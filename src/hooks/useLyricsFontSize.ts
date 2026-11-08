import { useSyncExternalStore } from 'react';

export const LYRICS_FONT_SIZE_KEY = 'songbridge.lyricsFontSize';
export const DEFAULT_LYRICS_FONT_SIZE = 38;
export const MIN_LYRICS_FONT_SIZE = 16;
export const MAX_LYRICS_FONT_SIZE = 72;
const listeners = new Set<() => void>();
let fallback = DEFAULT_LYRICS_FONT_SIZE;
let storageUnavailable = false;

function normalize(value: number) {
  return Number.isFinite(value)
    ? Math.round(Math.max(MIN_LYRICS_FONT_SIZE, Math.min(MAX_LYRICS_FONT_SIZE, value)))
    : DEFAULT_LYRICS_FONT_SIZE;
}
function read() {
  if (storageUnavailable) return fallback;
  try {
    const saved = localStorage.getItem(LYRICS_FONT_SIZE_KEY);
    return saved === null || saved.trim() === '' ? DEFAULT_LYRICS_FONT_SIZE : normalize(Number(saved));
  } catch {
    return fallback;
  }
}
function setFontSize(value: number) {
  fallback = normalize(value);
  try {
    localStorage.setItem(LYRICS_FONT_SIZE_KEY, String(fallback));
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
  }
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === LYRICS_FONT_SIZE_KEY || event.key === null) {
      storageUnavailable = false;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
export function useLyricsFontSize() {
  const fontSize = useSyncExternalStore(subscribe, read, () => DEFAULT_LYRICS_FONT_SIZE);
  return { fontSize, setFontSize, resetFontSize: () => setFontSize(DEFAULT_LYRICS_FONT_SIZE) };
}
