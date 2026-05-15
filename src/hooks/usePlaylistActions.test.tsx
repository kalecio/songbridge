import { renderHook, act } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../Context/AppContext';
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

const renderWithContext = (overrides: Partial<AppContextValue> = {}) => {
  const value = { ...baseContext, ...overrides };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
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
});

describe('usePlaylistActions', () => {
  describe('renamePlaylist', () => {
    it('renames via prompt, updates state, and persists', () => {
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('  New Name  ');
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      const pl = samplePlaylist();
      act(() => result.current.renamePlaylist(pl));
      expect(promptSpy).toHaveBeenCalledWith('Rename playlist', 'Chill Mix');
      expect(setPlaylists).toHaveBeenCalledTimes(1);
      const updater = setPlaylists.mock.calls[0][0];
      const result2 = updater([pl, { id: 'other', name: 'Other', songs: [] }]);
      expect(result2[0].name).toBe('New Name');
      expect(result2[1].name).toBe('Other');
      expect(mockInvoke).toHaveBeenCalledWith(
        'db_upsert_playlist',
        expect.objectContaining({ id: 'p1', name: 'New Name' }),
      );
      promptSpy.mockRestore();
    });

    it('does nothing when prompt is cancelled', () => {
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      act(() => result.current.renamePlaylist(samplePlaylist()));
      expect(setPlaylists).not.toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
      promptSpy.mockRestore();
    });

    it('does nothing when the name is unchanged after trimming', () => {
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('  Chill Mix  ');
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      act(() => result.current.renamePlaylist(samplePlaylist()));
      expect(setPlaylists).not.toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
      promptSpy.mockRestore();
    });

    it('refuses to rename the Favourites playlist', () => {
      const promptSpy = vi.spyOn(window, 'prompt');
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      act(() => result.current.renamePlaylist(favouritesPlaylist()));
      expect(promptSpy).not.toHaveBeenCalled();
      expect(setPlaylists).not.toHaveBeenCalled();
      promptSpy.mockRestore();
    });
  });

  describe('deletePlaylist', () => {
    it('confirms, removes from state, and invokes db_delete_playlist', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      const pl = samplePlaylist();
      act(() => result.current.deletePlaylist(pl));
      expect(confirmSpy).toHaveBeenCalledWith('Delete playlist "Chill Mix"?');
      expect(setPlaylists).toHaveBeenCalledTimes(1);
      const updater = setPlaylists.mock.calls[0][0];
      expect(updater([pl, { id: 'other', name: 'Other', songs: [] }])).toEqual([
        { id: 'other', name: 'Other', songs: [] },
      ]);
      expect(mockInvoke).toHaveBeenCalledWith('db_delete_playlist', { id: 'p1' });
      confirmSpy.mockRestore();
    });

    it('does nothing when the confirm dialog is dismissed', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      act(() => result.current.deletePlaylist(samplePlaylist()));
      expect(setPlaylists).not.toHaveBeenCalled();
      expect(mockInvoke).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('refuses to delete the Favourites playlist', () => {
      const confirmSpy = vi.spyOn(window, 'confirm');
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ setPlaylists });
      act(() => result.current.deletePlaylist(favouritesPlaylist()));
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(setPlaylists).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
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
});
