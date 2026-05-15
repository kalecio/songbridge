import { renderHook, waitFor } from '@testing-library/react';
import { listen, type EventCallback } from '@tauri-apps/api/event';
import { AUDIO_EVENTS } from '../audioEvents';
import { useMediaKeys } from './useMediaKeys';

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockListen = vi.mocked(listen);

const fire = <T,>(cb: EventCallback<T>, payload: T) => {
  cb({ event: 'mock', id: 0, payload });
};

type Registry = {
  handlers: Map<string, EventCallback<unknown>>;
  unlistens: Map<string, ReturnType<typeof vi.fn>>;
};

const setupListenMock = (): Registry => {
  const handlers = new Map<string, EventCallback<unknown>>();
  const unlistens = new Map<string, ReturnType<typeof vi.fn>>();
  mockListen.mockImplementation(async (event, cb) => {
    handlers.set(event as string, cb as EventCallback<unknown>);
    const unlisten = vi.fn();
    unlistens.set(event as string, unlisten);
    return unlisten;
  });
  return { handlers, unlistens };
};

beforeEach(() => {
  mockListen.mockReset();
});

describe('useMediaKeys', () => {
  it('registers listeners for play-pause / next / previous / seek', async () => {
    const registry = setupListenMock();
    renderHook(() => useMediaKeys());
    await waitFor(() => expect(registry.handlers.size).toBe(4));
    expect(registry.handlers.has('media-key:play-pause')).toBe(true);
    expect(registry.handlers.has('media-key:next')).toBe(true);
    expect(registry.handlers.has('media-key:previous')).toBe(true);
    expect(registry.handlers.has('media-key:seek')).toBe(true);
  });

  it('re-emits hardware media keys as window audio events', async () => {
    const registry = setupListenMock();
    renderHook(() => useMediaKeys());
    await waitFor(() => expect(registry.handlers.size).toBe(4));

    const cases: Array<[string, string]> = [
      ['media-key:play-pause', AUDIO_EVENTS.playPause],
      ['media-key:next', AUDIO_EVENTS.next],
      ['media-key:previous', AUDIO_EVENTS.previous],
    ];

    for (const [tauriEvent, audioEvent] of cases) {
      const spy = vi.fn();
      window.addEventListener(audioEvent, spy);
      fire(registry.handlers.get(tauriEvent)!, null);
      expect(spy).toHaveBeenCalledTimes(1);
      window.removeEventListener(audioEvent, spy);
    }
  });

  it('forwards seek payloads to the onSeek callback', async () => {
    const registry = setupListenMock();
    const onSeek = vi.fn();
    renderHook(() => useMediaKeys(onSeek));
    await waitFor(() => expect(registry.handlers.has('media-key:seek')).toBe(true));
    fire(registry.handlers.get('media-key:seek')!, 42);
    expect(onSeek).toHaveBeenCalledWith(42);
  });

  it('always uses the latest onSeek callback', async () => {
    const registry = setupListenMock();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }: { cb: (_s: number) => void }) => useMediaKeys(cb), {
      initialProps: { cb: first },
    });
    await waitFor(() => expect(registry.handlers.has('media-key:seek')).toBe(true));
    rerender({ cb: second });
    fire(registry.handlers.get('media-key:seek')!, 7);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(7);
  });

  it('calls every unlisten on unmount', async () => {
    const registry = setupListenMock();
    const { unmount } = renderHook(() => useMediaKeys());
    await waitFor(() => expect(registry.unlistens.size).toBe(4));
    unmount();
    for (const unlisten of registry.unlistens.values()) {
      expect(unlisten).toHaveBeenCalledTimes(1);
    }
  });

  it('silently swallows errors when listen rejects (e.g. outside Tauri)', async () => {
    mockListen.mockRejectedValue(new Error('not in Tauri'));
    expect(() => renderHook(() => useMediaKeys())).not.toThrow();
    await waitFor(() => expect(mockListen).toHaveBeenCalled());
  });
});
