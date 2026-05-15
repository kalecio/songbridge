import { renderHook, act } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../Context/AppContext';
import { ModalProvider } from '../Context/ModalContext';
import { DEFAULT_SHORTCUTS } from '../keyboard';
import { PlaylistType } from '../types';
import { FAVOURITES_PLAYLIST_ID } from './useFavourites';
import { usePlaylistActions } from './usePlaylistActions';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const mockInvoke = vi.mocked(invoke);

type AppContextValue = React.ComponentProps<typeof AppContext.Provider>['value'];

const baseContext: AppContextValue = {
  onRepeat: false,
  onShuffle: false,
  isPlaying: false,
  isScanning: false,
  scanProgress: { current: 0, total: 0 },
  shortcuts: DEFAULT_SHORTCUTS,
  library: [],
  libraryPaths: [],
  progress: 0,
  currentPlaylist: [],
  currentTheme: 'Midnight',
};

// The hook now drives a ModalProvider-backed promise API rather than
// window.prompt/window.confirm. We mock useModal at the module boundary so
// tests stay deterministic and don't need to simulate UI interactions.
const confirmMock = vi.fn();
const promptMock = vi.fn();

vi.mock('../Context/ModalContext', async () => {
  const actual = await vi.importActual<typeof import('../Context/ModalContext')>('../Context/ModalContext');
  return {
    ...actual,
    useModal: () => ({ confirm: confirmMock, prompt: promptMock }),
  };
});

const renderWithContext = (overrides: Partial<AppContextValue> = {}) => {
  const value = { ...baseContext, ...overrides };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppContext.Provider value={value}>
      <ModalProvider>{children}</ModalProvider>
    </AppContext.Provider>
  );
  return renderHook(() => usePlaylistActions(), { wrapper });
};

const samplePlaylist = (): PlaylistType => ({
  id: 'p1',
  name: 'Chill Mix',
  songs: [
    { path: '/a.mp3', title: 'A', artist: 'Artist 1' },
    { path: '/b.mp3', title: 'B', artist: 'Artist 2' },
  ],
});

const favouritesPlaylist = (): PlaylistType => ({
  id: FAVOURITES_PLAYLIST_ID,
  name: 'Favourites',
  songs: [],
});

beforeEach(() => {
  mockInvoke.mockClear();
  mockInvoke.mockResolvedValue(undefined);
  confirmMock.mockReset();
  promptMock.mockReset();
});

describe('usePlaylistActions', () => {
  describe('renamePlaylist', () => {
    it('renames via the modal prompt, updates state, and persists', async () => {
      promptMock.mockResolvedValue('  New Name  ');
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      const pl = samplePlaylist();
      await act(async () => {
        await result.current.renamePlaylist(pl);
      });
      expect(promptMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Rename playlist', defaultValue: 'Chill Mix' }),
      );
      expect(setPlaylists).toHaveBeenCalledTimes(1);
      const updater = setPlaylists.mock.calls[0][0];
      const next = updater([pl, { id: 'other', name: 'Other', songs: [] }]) as PlaylistType[];
      expect(next[0].name).toBe('New Name');
      expect(next[1].name).toBe('Other');
      expect(mockInvoke).toHaveBeenCalledWith(
        'db_upsert_playlist',
        expect.objectContaining({ id: 'p1', name: 'New Name' }),
      );
    });

    it('does nothing when the prompt is cancelled', async () => {
      promptMock.mockResolvedValue(null);
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      await act(async () => {
        await result.current.renamePlaylist(samplePlaylist());
      });
      expect(setPlaylists).not.toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('does nothing when the trimmed name is unchanged', async () => {
      promptMock.mockResolvedValue('  Chill Mix  ');
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      await act(async () => {
        await result.current.renamePlaylist(samplePlaylist());
      });
      expect(setPlaylists).not.toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('refuses to rename the Favourites playlist', async () => {
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      await act(async () => {
        await result.current.renamePlaylist(favouritesPlaylist());
      });
      expect(promptMock).not.toHaveBeenCalled();
      expect(setPlaylists).not.toHaveBeenCalled();
    });
  });

  describe('deletePlaylist', () => {
    it('confirms via the modal, removes from state, and invokes db_delete_playlist', async () => {
      confirmMock.mockResolvedValue(true);
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      const pl = samplePlaylist();
      await act(async () => {
        await result.current.deletePlaylist(pl);
      });
      expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete playlist', danger: true }));
      expect(setPlaylists).toHaveBeenCalledTimes(1);
      const updater = setPlaylists.mock.calls[0][0];
      expect(updater([pl, { id: 'other', name: 'Other', songs: [] }])).toEqual([
        { id: 'other', name: 'Other', songs: [] },
      ]);
      expect(mockInvoke).toHaveBeenCalledWith('db_delete_playlist', { id: 'p1' });
    });

    it('does nothing when the confirm dialog is dismissed', async () => {
      confirmMock.mockResolvedValue(false);
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      await act(async () => {
        await result.current.deletePlaylist(samplePlaylist());
      });
      expect(setPlaylists).not.toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('refuses to delete the Favourites playlist', async () => {
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      await act(async () => {
        await result.current.deletePlaylist(favouritesPlaylist());
      });
      expect(confirmMock).not.toHaveBeenCalled();
      expect(setPlaylists).not.toHaveBeenCalled();
    });
  });

  describe('removeSongFromPlaylist', () => {
    it('removes the song and persists the updated playlist', () => {
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      const pl = samplePlaylist();
      act(() => result.current.removeSongFromPlaylist(pl, { path: '/a.mp3' }));
      expect(setPlaylists).toHaveBeenCalledTimes(1);
      const updater = setPlaylists.mock.calls[0][0];
      const updated = updater([pl])[0] as PlaylistType;
      expect(updated.songs).toHaveLength(1);
      expect(updated.songs[0].path).toBe('/b.mp3');
      expect(mockInvoke).toHaveBeenCalledWith(
        'db_upsert_playlist',
        expect.objectContaining({
          id: 'p1',
          name: 'Chill Mix',
          songs: [expect.objectContaining({ path: '/b.mp3' })],
        }),
      );
    });

    it('is a no-op when the song has no path', () => {
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      act(() => result.current.removeSongFromPlaylist(samplePlaylist(), { title: 'No path' }));
      expect(setPlaylists).not.toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('addSongToPlaylist', () => {
    it('appends a new song and persists', () => {
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      const pl = samplePlaylist();
      const newSong = { path: '/c.mp3', title: 'C', artist: 'Artist 3' };
      act(() => result.current.addSongToPlaylist(pl, newSong));
      const updater = setPlaylists.mock.calls[0][0];
      const next = updater([pl]) as PlaylistType[];
      expect(next[0].songs.map((s) => s.path)).toEqual(['/a.mp3', '/b.mp3', '/c.mp3']);
      expect(mockInvoke).toHaveBeenCalledWith(
        'db_upsert_playlist',
        expect.objectContaining({
          id: 'p1',
          songs: expect.arrayContaining([expect.objectContaining({ path: '/c.mp3' })]),
        }),
      );
    });

    it('is a no-op when the song is already in the playlist', () => {
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      act(() => result.current.addSongToPlaylist(samplePlaylist(), { path: '/a.mp3' }));
      expect(setPlaylists).not.toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('is a no-op when the song has no path', () => {
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      act(() => result.current.addSongToPlaylist(samplePlaylist(), { title: 'No path' }));
      expect(setPlaylists).not.toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });
});
