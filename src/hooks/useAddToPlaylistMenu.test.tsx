import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppContext } from '../Context/AppContext';
import { DEFAULT_SHORTCUTS } from '../keyboard';
import { ContextMenuItem } from '../Components/ContextMenu/ContextMenu';
import { PlaylistType } from '../types';
import { useAddToPlaylistMenu } from './useAddToPlaylistMenu';
import { RECENT_PLAYLISTS_STORAGE_KEY } from './usePlayHistory';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const navigateMock = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => navigateMock };
});

type AppContextValue = React.ComponentProps<typeof AppContext.Provider>['value'];

const baseContext: AppContextValue = {
  onRepeat: 'none',
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

const renderBuilder = (overrides: Partial<AppContextValue> = {}) => {
  const value = { ...baseContext, ...overrides };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </MemoryRouter>
  );
  return renderHook(() => useAddToPlaylistMenu(), { wrapper });
};

const isSubmenu = (item: ContextMenuItem): item is Extract<ContextMenuItem, { type: 'submenu' }> =>
  item.type === 'submenu';

const isItem = (item: ContextMenuItem): item is Extract<ContextMenuItem, { type?: 'item' }> =>
  item.type === 'item' || item.type === undefined;

beforeEach(() => {
  window.localStorage.clear();
  navigateMock.mockReset();
});

describe('useAddToPlaylistMenu', () => {
  it('returns a submenu with just "Create new playlist" when no recent playlists exist', () => {
    const { result } = renderBuilder();
    const top = result.current({ path: '/x.mp3' });
    expect(isSubmenu(top)).toBe(true);
    if (!isSubmenu(top)) return;
    expect(top.label).toBe('Add to playlist');
    expect(top.items).toHaveLength(1);
    expect(isItem(top.items[0]) && top.items[0].label).toBe('Create new playlist');
  });

  it('includes a divider and the recent playlists when present', () => {
    const playlists: PlaylistType[] = [
      { id: 'a', name: 'Alpha', songs: [] },
      { id: 'b', name: 'Beta', songs: [] },
    ];
    window.localStorage.setItem(RECENT_PLAYLISTS_STORAGE_KEY, JSON.stringify(['b', 'a']));
    const { result } = renderBuilder({ playlists });
    const top = result.current({ path: '/x.mp3' });
    if (!isSubmenu(top)) throw new Error('expected submenu');
    expect(top.items).toHaveLength(4);
    expect(top.items[1].type).toBe('divider');
    const recentLabels = top.items.slice(2).map((i) => (isItem(i) ? i.label : ''));
    expect(recentLabels).toEqual(['Beta', 'Alpha']);
  });

  it('disables a recent-playlist item when the song is already in it', () => {
    const playlists: PlaylistType[] = [{ id: 'a', name: 'Alpha', songs: [{ path: '/x.mp3' }] }];
    window.localStorage.setItem(RECENT_PLAYLISTS_STORAGE_KEY, JSON.stringify(['a']));
    const { result } = renderBuilder({ playlists });
    const top = result.current({ path: '/x.mp3' });
    if (!isSubmenu(top)) throw new Error('expected submenu');
    const alpha = top.items.find((i) => isItem(i) && i.label === 'Alpha');
    expect(alpha && isItem(alpha) && alpha.disabled).toBe(true);
  });

  it('ignores recent ids that no longer correspond to an existing playlist', () => {
    const playlists: PlaylistType[] = [{ id: 'a', name: 'Alpha', songs: [] }];
    window.localStorage.setItem(RECENT_PLAYLISTS_STORAGE_KEY, JSON.stringify(['ghost', 'a']));
    const { result } = renderBuilder({ playlists });
    const top = result.current({ path: '/x.mp3' });
    if (!isSubmenu(top)) throw new Error('expected submenu');
    const recentLabels = top.items.slice(2).map((i) => (isItem(i) ? i.label : ''));
    expect(recentLabels).toEqual(['Alpha']);
  });

  it('Create new playlist navigates to /playlist with the song in router state', () => {
    const { result } = renderBuilder();
    const top = result.current({ path: '/x.mp3', title: 'Track' });
    if (!isSubmenu(top)) throw new Error('expected submenu');
    const create = top.items[0];
    if (!isItem(create)) throw new Error('expected item');
    act(() => create.onSelect());
    expect(navigateMock).toHaveBeenCalledWith(
      '/playlist',
      expect.objectContaining({
        state: expect.objectContaining({ addSong: expect.objectContaining({ path: '/x.mp3' }) }),
      }),
    );
  });

  it('selecting a recent playlist adds the song and persists', () => {
    const playlists: PlaylistType[] = [{ id: 'a', name: 'Alpha', songs: [] }];
    window.localStorage.setItem(RECENT_PLAYLISTS_STORAGE_KEY, JSON.stringify(['a']));
    const setPlaylists = vi.fn();
    const { result } = renderBuilder({ playlists, setPlaylists });
    const top = result.current({ path: '/x.mp3' });
    if (!isSubmenu(top)) throw new Error('expected submenu');
    const alpha = top.items[2];
    if (!isItem(alpha)) throw new Error('expected item');
    act(() => alpha.onSelect());
    expect(setPlaylists).toHaveBeenCalledTimes(1);
  });

  it('disables the top-level submenu when the song has no path', () => {
    const { result } = renderBuilder();
    const top = result.current({ title: 'No path' });
    if (!isSubmenu(top)) throw new Error('expected submenu');
    expect(top.disabled).toBe(true);
  });

  describe('fallback when no playlist has been played', () => {
    it('lists the most recently created playlists (newest first)', () => {
      const playlists: PlaylistType[] = [
        { id: 'a', name: 'Alpha', songs: [] },
        { id: 'b', name: 'Beta', songs: [] },
        { id: 'c', name: 'Gamma', songs: [] },
      ];
      const { result } = renderBuilder({ playlists });
      const top = result.current({ path: '/x.mp3' });
      if (!isSubmenu(top)) throw new Error('expected submenu');
      expect(top.items[1].type).toBe('divider');
      const labels = top.items.slice(2).map((i) => (isItem(i) ? i.label : ''));
      expect(labels).toEqual(['Gamma', 'Beta', 'Alpha']);
    });

    it('caps the fallback at 5 playlists', () => {
      const playlists: PlaylistType[] = Array.from({ length: 8 }, (_, i) => ({
        id: `p${i}`,
        name: `Playlist ${i}`,
        songs: [],
      }));
      const { result } = renderBuilder({ playlists });
      const top = result.current({ path: '/x.mp3' });
      if (!isSubmenu(top)) throw new Error('expected submenu');
      const labels = top.items.slice(2).map((i) => (isItem(i) ? i.label : ''));
      expect(labels).toEqual(['Playlist 7', 'Playlist 6', 'Playlist 5', 'Playlist 4', 'Playlist 3']);
    });

    it('prefers recent-play history over the creation-order fallback when both are available', () => {
      const playlists: PlaylistType[] = [
        { id: 'a', name: 'Alpha', songs: [] },
        { id: 'b', name: 'Beta', songs: [] },
      ];
      window.localStorage.setItem(RECENT_PLAYLISTS_STORAGE_KEY, JSON.stringify(['a']));
      const { result } = renderBuilder({ playlists });
      const top = result.current({ path: '/x.mp3' });
      if (!isSubmenu(top)) throw new Error('expected submenu');
      const labels = top.items.slice(2).map((i) => (isItem(i) ? i.label : ''));
      expect(labels).toEqual(['Alpha']);
    });
  });
});
