import { renderHook, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { useLazyAlbumArt } from './useLazyAlbumArt';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

// Each test uses a unique path to avoid the module-level cache leaking across cases.
let counter = 0;
const uniquePath = () => `/track-${++counter}.mp3`;

beforeEach(() => {
  mockInvoke.mockReset();
});

describe('useLazyAlbumArt', () => {
  it('returns the eager image immediately without a roundtrip', () => {
    const { result } = renderHook(() => useLazyAlbumArt(uniquePath(), 'data:eager'));
    expect(result.current).toBe('data:eager');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('returns undefined when there is no path and no eager image', () => {
    const { result } = renderHook(() => useLazyAlbumArt(undefined, undefined));
    expect(result.current).toBeUndefined();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('fetches the art via Tauri when only a path is provided', async () => {
    mockInvoke.mockResolvedValue('data:fetched');
    const path = uniquePath();
    const { result } = renderHook(() => useLazyAlbumArt(path));
    await waitFor(() => expect(result.current).toBe('data:fetched'));
    expect(mockInvoke).toHaveBeenCalledWith('get_track_image', { path });
  });

  it('returns undefined when the backend has no embedded art', async () => {
    mockInvoke.mockResolvedValue(null);
    const { result } = renderHook(() => useLazyAlbumArt(uniquePath()));
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it('serves cached results without re-invoking the backend on remount', async () => {
    mockInvoke.mockResolvedValue('data:cached');
    const path = uniquePath();
    const first = renderHook(() => useLazyAlbumArt(path));
    await waitFor(() => expect(first.result.current).toBe('data:cached'));
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    mockInvoke.mockClear();
    const second = renderHook(() => useLazyAlbumArt(path));
    expect(second.result.current).toBe('data:cached');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('falls back to undefined when the Tauri call rejects', async () => {
    mockInvoke.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useLazyAlbumArt(uniquePath()));
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });
});
