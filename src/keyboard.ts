// Keyboard shortcut model + helpers. Bindings are stored as canonical strings
// like "Mod+K", "Space", "ArrowRight", "S" so they're stable across keyboard
// layouts. "Mod" means ⌘ on macOS and Ctrl elsewhere.

export type ShortcutAction = 'playPause' | 'next' | 'previous' | 'shuffle' | 'repeat' | 'mute' | 'openFiles' | 'search';

export type ShortcutBindings = Record<ShortcutAction, string>;

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  playPause: 'Play / Pause',
  next: 'Next track',
  previous: 'Previous track',
  shuffle: 'Toggle shuffle',
  repeat: 'Toggle repeat',
  mute: 'Toggle mute',
  openFiles: 'Open audio files',
  search: 'Focus search',
};

export const DEFAULT_SHORTCUTS: ShortcutBindings = {
  playPause: 'Space',
  next: 'N',
  previous: 'P',
  shuffle: 'S',
  repeat: 'R',
  mute: 'M',
  openFiles: 'Mod+O',
  search: 'Mod+/',
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift']);

const codeToKey = (code: string, key: string): string => {
  if (code === 'Space') return 'Space';
  if (code.startsWith('Arrow')) return code; // ArrowLeft, ArrowRight, …
  if (code.startsWith('Key')) return code.slice(3); // KeyA → A
  if (code.startsWith('Digit')) return code.slice(5); // Digit5 → 5
  if (code.startsWith('Numpad')) return code.slice(6);
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
};

/** Build a canonical binding string from a keydown event. Returns null if the
 * event is just a modifier press (which should never be saved as a binding). */
export const eventToBinding = (e: KeyboardEvent): string | null => {
  if (MODIFIER_KEYS.has(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Mod');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(codeToKey(e.code, e.key));
  return parts.join('+');
};

/** Does the event match the canonical binding string? */
export const matchesBinding = (e: KeyboardEvent, binding: string): boolean => {
  const candidate = eventToBinding(e);
  if (!candidate) return false;
  return candidate.toLowerCase() === binding.toLowerCase();
};

/** Render a binding for display. On macOS Mod renders as ⌘, elsewhere Ctrl. */
export const formatBinding = (binding: string): string => {
  if (!binding) return '';
  return binding
    .split('+')
    .map((part) => {
      if (part === 'Mod') return isMac ? '⌘' : 'Ctrl';
      if (part === 'Shift') return isMac ? '⇧' : 'Shift';
      if (part === 'Alt') return isMac ? '⌥' : 'Alt';
      if (part === 'ArrowLeft') return '←';
      if (part === 'ArrowRight') return '→';
      if (part === 'ArrowUp') return '↑';
      if (part === 'ArrowDown') return '↓';
      return part;
    })
    .join(isMac ? '' : '+');
};

const STORAGE_KEY = 'songbridge.shortcuts';

export const loadShortcuts = (): ShortcutBindings => {
  if (typeof window === 'undefined') return { ...DEFAULT_SHORTCUTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SHORTCUTS };
    const parsed = JSON.parse(raw) as Partial<ShortcutBindings>;
    return { ...DEFAULT_SHORTCUTS, ...parsed };
  } catch {
    return { ...DEFAULT_SHORTCUTS };
  }
};

export const saveShortcuts = (bindings: ShortcutBindings) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // ignore — quota or privacy mode
  }
};
