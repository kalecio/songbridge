import { invoke } from '@tauri-apps/api/core';
import { useLrclibLyrics, SearchLyricsParams, DownloadLyricsParams } from './useLrclibLyrics';
import { renderHook, act } from '@testing-library/react';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

const mockTrackResponse = {
  id: 1,
  trackName: 'Test Track',
  artistName: 'Test Artist',
  albumName: 'Test Album',
  duration: 180,
  instrumental: false,
  plainLyrics: 'Plain lyrics content',
  syncedLyrics: '[00:00]Synced lyrics content',
};

const mockPreview = {
  hasSynced: true,
  hasPlain: true,
  instrumental: false,
  duration: 180,
  trackName: 'Test Track',
  artistName: 'Test Artist',
  albumName: 'Test Album',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useLrclibLyrics', () => {
  it('searchLyrics calls invoke with correct params', async () => {
    mockInvoke.mockResolvedValue([mockTrackResponse]);
    const { result } = renderHook(() => useLrclibLyrics());

    const params: SearchLyricsParams = {
      trackName: 'Test Track',
      artistName: 'Test Artist',
      albumName: 'Test Album',
      query: 'test query',
    };

    let data!: Awaited<ReturnType<typeof result.current.searchLyrics>>;
    await act(async () => {
      data = await result.current.searchLyrics(params);
    });

    expect(mockInvoke).toHaveBeenCalledWith('search_lrclib_lyrics', params);
    expect(data).toEqual([mockTrackResponse]);
  });

  it('getLyricsById calls invoke with trackId', async () => {
    mockInvoke.mockResolvedValue(mockTrackResponse);
    const { result } = renderHook(() => useLrclibLyrics());

    let data!: Awaited<ReturnType<typeof result.current.getLyricsById>>;
    await act(async () => {
      data = await result.current.getLyricsById(1);
    });

    expect(mockInvoke).toHaveBeenCalledWith('get_lrclib_lyrics_by_id', { trackId: 1 });
    expect(data).toEqual(mockTrackResponse);
  });

  it('getLyricsPreview calls invoke with trackId', async () => {
    mockInvoke.mockResolvedValue(mockPreview);
    const { result } = renderHook(() => useLrclibLyrics());

    let data!: Awaited<ReturnType<typeof result.current.getLyricsPreview>>;
    await act(async () => {
      data = await result.current.getLyricsPreview(1);
    });

    expect(mockInvoke).toHaveBeenCalledWith('get_lrclib_lyrics_preview', { trackId: 1 });
    expect(data).toEqual(mockPreview);
  });

  it('downloadLyrics calls invoke with all params including plain and synced lyrics', async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLrclibLyrics());

    const params: DownloadLyricsParams = {
      songPath: '/music/test.mp3',
      trackId: 1,
      preferSynced: true,
      plainLyrics: 'Plain lyrics',
      syncedLyrics: '[00:00]Synced',
    };

    await act(async () => {
      await result.current.downloadLyrics(params);
    });

    expect(mockInvoke).toHaveBeenCalledWith('download_lrclib_lyrics', params);
  });

  it('downloadLyrics works without optional lyrics params', async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLrclibLyrics());

    const params: DownloadLyricsParams = {
      songPath: '/music/test.mp3',
      trackId: 1,
      preferSynced: false,
    };

    await act(async () => {
      await result.current.downloadLyrics(params);
    });

    expect(mockInvoke).toHaveBeenCalledWith('download_lrclib_lyrics', params);
  });

  it('handles invoke errors', async () => {
    mockInvoke.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useLrclibLyrics());

    await act(async () => {
      try {
        await result.current.searchLyrics({ query: 'test' });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe('Network error');
      }
    });
  });
});

describe('download refresh notifications', () => {
  it('notifies the lyrics page only after a successful save', async () => {
    const listener = vi.fn();
    window.addEventListener('songbridge:lyrics-updated', listener);
    try {
      const { result } = renderHook(() => useLrclibLyrics());
      const params = { songPath: '/music/test.mp3', trackId: 1, preferSynced: false, plainLyrics: 'Lyrics' };
      mockInvoke.mockRejectedValueOnce(new Error('Cannot write file'));
      await expect(result.current.downloadLyrics(params)).rejects.toThrow('Cannot write file');
      expect(listener).not.toHaveBeenCalled();
      mockInvoke.mockResolvedValueOnce(undefined);
      await result.current.downloadLyrics(params);
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toBe(params.songPath);
    } finally {
      window.removeEventListener('songbridge:lyrics-updated', listener);
    }
  });
});
