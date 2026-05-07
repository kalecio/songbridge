import { useEffect } from 'react';
import { matchesBinding, ShortcutAction, ShortcutBindings } from '../keyboard';

type Handlers = Partial<Record<ShortcutAction, () => void>>;

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

/**
 * Register a global keyboard listener that fires the matching handler when a
 * shortcut binding matches. Skips events whose target is an editable element
 * UNLESS the shortcut requires a modifier (so ⌘K still works while typing in
 * the search box, but plain "S" doesn't trigger shuffle).
 */
export const useKeyboardShortcuts = (handlers: Handlers, bindings: ShortcutBindings) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const editable = isEditableTarget(e.target);
      for (const [action, handler] of Object.entries(handlers) as [ShortcutAction, () => void][]) {
        if (!handler) continue;
        const binding = bindings[action];
        if (!binding) continue;
        const requiresModifier = /\b(Mod|Alt|Shift)\b/.test(binding);
        if (editable && !requiresModifier) continue;
        if (matchesBinding(e, binding)) {
          e.preventDefault();
          handler();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, bindings]);
};
