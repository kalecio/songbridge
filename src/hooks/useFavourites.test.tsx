import { renderHook, act } from '@testing-library/react';
import { AppContext } from '../Context/AppContext';
import { DEFAULT_SHORTCUTS } from '../keyboard';
import { PlaylistType } from '../types';
import {
  FAVOURITES_PLAYLIST_ID,
  FAVOURITES_PLAYLIST_NAME,
  isFavouritesPlaylist,
  sortFavouritesFirst,
  useFavourites,
} from './useFavourites';

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
  return renderHook(() => useFavourites(), { wrapper });
};

describe('isFavouritesPlaylist', () => {
  it('matches the favourites id', () => {
    expect(isFavouritesPlaylist(FAVOURITES_PLAYLIST_ID)).toBe(true);
  });
  it('does not match other ids', () => {
    expect(isFavouritesPlaylist('other')).toBe(false);
    expect(isFavouritesPlaylist(undefined)).toBe(false);
  });
});

describe('sortFavouritesFirst', () => {
  it('moves the favourites playlist to the front while preserving the rest of the order', () => {
    const playlists: PlaylistType[] = [
      { id: 'a', name: 'A', songs: [] },
      { id: FAVOURITES_PLAYLIST_ID, name: FAVOURITES_PLAYLIST_NAME, songs: [] },
      { id: 'b', name: 'B', songs: [] },
    ];
    const sorted = sortFavouritesFirst(playlists);
    expect(sorted.map((p) => p.id)).toEqual([FAVOURITES_PLAYLIST_ID, 'a', 'b']);
  });

  it('leaves the list unchanged when there are no favourites', () => {
    const playlists: PlaylistType[] = [
      { id: 'a', name: 'A', songs: [] },
      { id: 'b', name: 'B', songs: [] },
    ];
    expect(sortFavouritesFirst(playlists).map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('useFavourites', () => {
  describe('isFavourite', () => {
    it('returns true when the path is in the favourites playlist', () => {
      const favourites: PlaylistType = {
        id: FAVOURITES_PLAYLIST_ID,
        name: FAVOURITES_PLAYLIST_NAME,
        songs: [{ path: '/a.mp3' }],
      };
      const { result } = renderWithContext({ playlists: [favourites] });
      expect(result.current.isFavourite('/a.mp3')).toBe(true);
      expect(result.current.isFavourite('/b.mp3')).toBe(false);
    });

    it('returns false when no path is provided or no favourites playlist exists', () => {
      const { result } = renderWithContext({ playlists: [] });
      expect(result.current.isFavourite(undefined)).toBe(false);
      expect(result.current.isFavourite('/a.mp3')).toBe(false);
    });
  });

  describe('toggleFavourite', () => {
    it('creates the favourites playlist on first toggle', () => {
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ playlists: [], setPlaylists });
      act(() => result.current.toggleFavourite({ path: '/a.mp3', title: 'A' }));
      expect(setPlaylists).toHaveBeenCalledTimes(1);
      const updater = setPlaylists.mock.calls[0][0];
      const next = updater([]) as PlaylistType[];
      expect(next).toHaveLength(1);
      expect(next[0].id).toBe(FAVOURITES_PLAYLIST_ID);
      expect(next[0].songs).toEqual([{ path: '/a.mp3', title: 'A' }]);
    });

    it('adds a new song when favourites already exists', () => {
      const favourites: PlaylistType = {
        id: FAVOURITES_PLAYLIST_ID,
        name: FAVOURITES_PLAYLIST_NAME,
        songs: [{ path: '/a.mp3' }],
      };
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ playlists: [favourites], setPlaylists });
      act(() => result.current.toggleFavourite({ path: '/b.mp3' }));
      const updater = setPlaylists.mock.calls[0][0];
      const next = updater([favourites]) as PlaylistType[];
      expect(next[0].songs.map((s) => s.path)).toEqual(['/a.mp3', '/b.mp3']);
    });

    it('removes a song that is already a favourite', () => {
      const favourites: PlaylistType = {
        id: FAVOURITES_PLAYLIST_ID,
        name: FAVOURITES_PLAYLIST_NAME,
        songs: [{ path: '/a.mp3' }, { path: '/b.mp3' }],
      };
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ playlists: [favourites], setPlaylists });
      act(() => result.current.toggleFavourite({ path: '/a.mp3' }));
      const updater = setPlaylists.mock.calls[0][0];
      const next = updater([favourites]) as PlaylistType[];
      expect(next[0].songs.map((s) => s.path)).toEqual(['/b.mp3']);
    });

    it('does nothing when the song has no path', () => {
      const setPlaylists = vi.fn();
      const { result } = renderWithContext({ playlists: [], setPlaylists });
      act(() => result.current.toggleFavourite({ title: 'No path' }));
      expect(setPlaylists).not.toHaveBeenCalled();
    });
  });
});
