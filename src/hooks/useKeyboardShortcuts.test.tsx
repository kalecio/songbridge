import { renderHook } from '@testing-library/react';
import { DEFAULT_SHORTCUTS, ShortcutBindings } from '../keyboard';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

const dispatchKey = (init: KeyboardEventInit & { target?: EventTarget }) => {
  const { target, ...rest } = init;
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...rest });
  if (target) {
    target.dispatchEvent(event);
  } else {
    window.dispatchEvent(event);
  }
  return event;
};

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fires the handler when a binding matches', () => {
    const playPause = vi.fn();
    renderHook(() => useKeyboardShortcuts({ playPause }, DEFAULT_SHORTCUTS));
    dispatchKey({ key: ' ', code: 'Space' });
    expect(playPause).toHaveBeenCalledTimes(1);
  });

  it('does not fire when there is no handler for that action', () => {
    renderHook(() => useKeyboardShortcuts({}, DEFAULT_SHORTCUTS));
    const event = dispatchKey({ key: ' ', code: 'Space' });
    expect(event.defaultPrevented).toBe(false);
  });

  it('calls preventDefault on matched events', () => {
    const playPause = vi.fn();
    renderHook(() => useKeyboardShortcuts({ playPause }, DEFAULT_SHORTCUTS));
    const event = dispatchKey({ key: ' ', code: 'Space' });
    expect(event.defaultPrevented).toBe(true);
  });

  it('skips plain-letter shortcuts when typing in an input', () => {
    const shuffle = vi.fn();
    renderHook(() => useKeyboardShortcuts({ shuffle }, DEFAULT_SHORTCUTS));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    dispatchKey({ key: 's', code: 'KeyS', target: input });
    expect(shuffle).not.toHaveBeenCalled();
  });

  it('still fires modifier shortcuts when typing in an input', () => {
    const search = vi.fn();
    renderHook(() => useKeyboardShortcuts({ search }, DEFAULT_SHORTCUTS));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    dispatchKey({ key: '/', code: 'Slash', metaKey: true, target: input });
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('respects custom bindings', () => {
    const next = vi.fn();
    const bindings: ShortcutBindings = { ...DEFAULT_SHORTCUTS, next: 'ArrowRight' };
    renderHook(() => useKeyboardShortcuts({ next }, bindings));
    dispatchKey({ key: 'ArrowRight', code: 'ArrowRight' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const playPause = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ playPause }, DEFAULT_SHORTCUTS));
    unmount();
    dispatchKey({ key: ' ', code: 'Space' });
    expect(playPause).not.toHaveBeenCalled();
  });
});
