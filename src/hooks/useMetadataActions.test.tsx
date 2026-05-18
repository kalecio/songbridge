import { renderHook, act } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import React from 'react';
import { AppContext } from '../Context/AppContext';
import { useMetadataActions } from './useMetadataActions';
import * as albumArt from './useLazyAlbumArt';
import type { MetadataType, PlaylistType } from '../types';
import { DEFAULT_SHORTCUTS } from '../keyboard';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('./useLazyAlbumArt', () => ({
  updateCachedArt: vi.fn(),
  invalidateCachedArt: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);
const mockUpdateCachedArt = vi.mocked(albumArt.updateCachedArt);
const mockInvalidateCachedArt = vi.mocked(albumArt.invalidateCachedArt);

const makeSong = (overrides: Partial<MetadataType> = {}): MetadataType => ({
  path: '/music/song.mp3',
  title: 'Song',
  artist: 'Artist',
  album: 'Album',
  year: '2020',
  track: 1,
  image: undefined,
  ...overrides,
});

interface ContextOverrides {
  library?: MetadataType[];
  metadata?: MetadataType;
  currentPath?: string;
  currentPlaylist?: string[];
  playlists?: PlaylistType[];
  setLibrary?: (_lib: MetadataType[]) => void;
  setMetadata?: (_m?: MetadataType) => void;
  setCurrentPath?: (_p?: string) => void;
  setCurrentPlaylist?: (_q: string[]) => void;
  setPlaylists?: React.Dispatch<React.SetStateAction<PlaylistType[]>>;
}

const renderWithContext = (overrides: ContextOverrides = {}) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppContext.Provider
      value={{
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
        ...overrides,
      }}
    >
      {children}
    </AppContext.Provider>
  );
  return renderHook(() => useMetadataActions(), { wrapper });
};

beforeEach(() => {
  mockInvoke.mockReset();
  mockUpdateCachedArt.mockReset();
  mockInvalidateCachedArt.mockReset();
});

describe('useMetadataActions', () => {
  describe('updateSongMetadata — basic field update', () => {
    it('invokes update_track_metadata with correct args', async () => {
      const song = makeSong();
      const result = makeSong({ title: 'New Title' });
      mockInvoke.mockResolvedValue(result);

      const setLibrary = vi.fn();
      const { result: hook } = renderWithContext({
        library: [song],
        setLibrary,
      });

      await act(async () => {
        await hook.current.updateSongMetadata(song.path!, {
          title: 'New Title',
          artist: 'Artist',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_track_metadata', {
        path: song.path,
        title: 'New Title',
        artist: 'Artist',
        album: null,
        year: null,
        track: null,
        coverArtPath: null,
        removeCoverArt: false,
        newFilename: null,
      });
    });

    it('updates the library entry with returned fields', async () => {
      const song = makeSong({ path: '/music/a.mp3', title: 'Old' });
      const updatedResult = makeSong({ path: '/music/a.mp3', title: 'New', image: undefined });
      mockInvoke.mockResolvedValue(updatedResult);

      const setLibrary = vi.fn();
      const { result: hook } = renderWithContext({
        library: [song],
        setLibrary,
      });

      await act(async () => {
        await hook.current.updateSongMetadata('/music/a.mp3', { title: 'New' });
      });

      expect(setLibrary).toHaveBeenCalledTimes(1);
      const newLib: MetadataType[] = setLibrary.mock.calls[0][0];
      expect(newLib[0].title).toBe('New');
      expect(newLib[0].path).toBe('/music/a.mp3');
    });
  });

  describe('updateSongMetadata — cover art replaced', () => {
    it('updates image cache and library image when backend returns new art', async () => {
      const song = makeSong({ path: '/music/a.mp3', image: 'data:old' });
      const result = makeSong({ path: '/music/a.mp3', image: 'data:new' });
      mockInvoke.mockResolvedValue(result);

      const setLibrary = vi.fn();
      const { result: hook } = renderWithContext({ library: [song], setLibrary });

      await act(async () => {
        await hook.current.updateSongMetadata('/music/a.mp3', { coverArtPath: '/tmp/cover.jpg' });
      });

      expect(mockUpdateCachedArt).toHaveBeenCalledWith('/music/a.mp3', 'data:new');
      const newLib: MetadataType[] = setLibrary.mock.calls[0][0];
      expect(newLib[0].image).toBe('data:new');
    });
  });

  describe('updateSongMetadata — cover art removed', () => {
    it('invalidates cache and clears library image when removeCoverArt is true', async () => {
      const song = makeSong({ path: '/music/a.mp3', image: 'data:old' });
      const result = makeSong({ path: '/music/a.mp3', image: undefined });
      mockInvoke.mockResolvedValue(result);

      const setLibrary = vi.fn();
      const { result: hook } = renderWithContext({ library: [song], setLibrary });

      await act(async () => {
        await hook.current.updateSongMetadata('/music/a.mp3', { removeCoverArt: true });
      });

      expect(mockInvalidateCachedArt).toHaveBeenCalledWith('/music/a.mp3');
      const newLib: MetadataType[] = setLibrary.mock.calls[0][0];
      expect(newLib[0].image).toBeUndefined();
    });
  });

  describe('updateSongMetadata — file rename (path change)', () => {
    it('updates library, currentPath, currentPlaylist, and playlists on rename', async () => {
      const oldPath = '/music/old.mp3';
      const newPath = '/music/new.mp3';
      const song = makeSong({ path: oldPath });
      const result = makeSong({ path: newPath });
      mockInvoke.mockResolvedValue(result);

      const setLibrary = vi.fn();
      const setMetadata = vi.fn();
      const setCurrentPath = vi.fn();
      const setCurrentPlaylist = vi.fn();
      const setPlaylists = vi.fn();

      const playlist: PlaylistType = {
        id: 'pl-1',
        name: 'My Playlist',
        songs: [{ path: oldPath, title: 'Song', artist: 'Artist' }],
      };

      const { result: hook } = renderWithContext({
        library: [song],
        metadata: song,
        currentPath: oldPath,
        currentPlaylist: [oldPath],
        playlists: [playlist],
        setLibrary,
        setMetadata,
        setCurrentPath,
        setCurrentPlaylist,
        setPlaylists,
      });

      await act(async () => {
        await hook.current.updateSongMetadata(oldPath, { newFilename: 'new' });
      });

      // Library path updated
      const newLib: MetadataType[] = setLibrary.mock.calls[0][0];
      expect(newLib[0].path).toBe(newPath);

      // Now-playing path updated
      expect(setMetadata).toHaveBeenCalledWith(expect.objectContaining({ path: newPath }));
      expect(setCurrentPath).toHaveBeenCalledWith(newPath);

      // Queue updated
      expect(setCurrentPlaylist).toHaveBeenCalledWith([newPath]);

      // Playlists updated
      expect(setPlaylists).toHaveBeenCalledTimes(1);
      const updaterFn = setPlaylists.mock.calls[0][0];
      const updatedPlaylists: PlaylistType[] = updaterFn([playlist]);
      expect(updatedPlaylists[0].songs[0].path).toBe(newPath);
    });

    it('moves image cache entry to new path and busts old path on rename', async () => {
      const oldPath = '/music/old.mp3';
      const newPath = '/music/new.mp3';
      const song = makeSong({ path: oldPath, image: 'data:existing' });
      const result = makeSong({ path: newPath, image: undefined });
      mockInvoke.mockResolvedValue(result);

      const setLibrary = vi.fn();
      const { result: hook } = renderWithContext({ library: [song], setLibrary });

      await act(async () => {
        await hook.current.updateSongMetadata(oldPath, { newFilename: 'new' });
      });

      expect(mockUpdateCachedArt).toHaveBeenCalledWith(newPath, 'data:existing');
      expect(mockInvalidateCachedArt).toHaveBeenCalledWith(oldPath);
    });
  });

  describe('updateSongMetadata — now-playing state', () => {
    it('updates metadata when the edited song is currently playing', async () => {
      const path = '/music/a.mp3';
      const song = makeSong({ path, title: 'Old' });
      const result = makeSong({ path, title: 'New', image: undefined });
      mockInvoke.mockResolvedValue(result);

      const setMetadata = vi.fn();
      const { result: hook } = renderWithContext({
        library: [song],
        metadata: song,
        setMetadata,
      });

      await act(async () => {
        await hook.current.updateSongMetadata(path, { title: 'New' });
      });

      expect(setMetadata).toHaveBeenCalledWith(expect.objectContaining({ title: 'New', path }));
    });

    it('does not call setMetadata when a different song is playing', async () => {
      const song = makeSong({ path: '/music/a.mp3' });
      const nowPlaying = makeSong({ path: '/music/other.mp3' });
      const result = makeSong({ path: '/music/a.mp3' });
      mockInvoke.mockResolvedValue(result);

      const setMetadata = vi.fn();
      const { result: hook } = renderWithContext({
        library: [song],
        metadata: nowPlaying,
        setMetadata,
      });

      await act(async () => {
        await hook.current.updateSongMetadata('/music/a.mp3', { title: 'New' });
      });

      expect(setMetadata).not.toHaveBeenCalled();
    });
  });

  describe('updateSongMetadata — invoke args mapping', () => {
    it('sends null for every omitted optional field', async () => {
      const song = makeSong();
      mockInvoke.mockResolvedValue(song);

      const { result: hook } = renderWithContext({ library: [song] });

      await act(async () => {
        await hook.current.updateSongMetadata(song.path!, {});
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_track_metadata', {
        path: song.path,
        title: null,
        artist: null,
        album: null,
        year: null,
        track: null,
        coverArtPath: null,
        removeCoverArt: false,
        newFilename: null,
      });
    });

    it('maps removeCoverArt: true correctly', async () => {
      const song = makeSong();
      mockInvoke.mockResolvedValue(song);
      const { result: hook } = renderWithContext({ library: [song] });

      await act(async () => {
        await hook.current.updateSongMetadata(song.path!, { removeCoverArt: true });
      });

      expect(mockInvoke).toHaveBeenCalledWith(
        'update_track_metadata',
        expect.objectContaining({ removeCoverArt: true }),
      );
    });
  });

  // ── batchUpdateSongsMetadata ───────────────────────────────────────────────

  describe('batchUpdateSongsMetadata', () => {
    it('is a noop when the paths array is empty', async () => {
      const setLibrary = vi.fn();
      const { result: hook } = renderWithContext({ library: [], setLibrary });

      await act(async () => {
        await hook.current.batchUpdateSongsMetadata([], { artist: 'New' });
      });

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(setLibrary).not.toHaveBeenCalled();
    });

    it('invokes update_track_metadata once per song', async () => {
      const songA = makeSong({ path: '/a.mp3' });
      const songB = makeSong({ path: '/b.mp3' });
      mockInvoke.mockResolvedValueOnce({ ...songA, artist: 'New' }).mockResolvedValueOnce({ ...songB, artist: 'New' });

      const { result: hook } = renderWithContext({ library: [songA, songB] });

      await act(async () => {
        await hook.current.batchUpdateSongsMetadata(['/a.mp3', '/b.mp3'], { artist: 'New' });
      });

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(mockInvoke).toHaveBeenNthCalledWith(
        1,
        'update_track_metadata',
        expect.objectContaining({ path: '/a.mp3', artist: 'New' }),
      );
      expect(mockInvoke).toHaveBeenNthCalledWith(
        2,
        'update_track_metadata',
        expect.objectContaining({ path: '/b.mp3', artist: 'New' }),
      );
    });

    it('applies exactly one setLibrary call that patches every updated song', async () => {
      const songA = makeSong({ path: '/a.mp3', artist: 'Old' });
      const songB = makeSong({ path: '/b.mp3', artist: 'Old' });
      const songC = makeSong({ path: '/c.mp3', artist: 'Old' });
      mockInvoke
        .mockResolvedValueOnce({ ...songA, artist: 'New' })
        .mockResolvedValueOnce({ ...songB, artist: 'New' })
        .mockResolvedValueOnce({ ...songC, artist: 'New' });

      const setLibrary = vi.fn();
      const { result: hook } = renderWithContext({
        library: [songA, songB, songC],
        setLibrary,
      });

      await act(async () => {
        await hook.current.batchUpdateSongsMetadata(['/a.mp3', '/b.mp3', '/c.mp3'], { artist: 'New' });
      });

      // Core invariant: a single update covers all songs, not one call per song.
      expect(setLibrary).toHaveBeenCalledTimes(1);
      const newLib: MetadataType[] = setLibrary.mock.calls[0][0];
      expect(newLib.find((s) => s.path === '/a.mp3')?.artist).toBe('New');
      expect(newLib.find((s) => s.path === '/b.mp3')?.artist).toBe('New');
      expect(newLib.find((s) => s.path === '/c.mp3')?.artist).toBe('New');
    });

    it('preserves songs that are not in the batch', async () => {
      const target = makeSong({ path: '/a.mp3', artist: 'Old' });
      const bystander = makeSong({ path: '/other.mp3', artist: 'Bystander' });
      mockInvoke.mockResolvedValueOnce({ ...target, artist: 'New' });

      const setLibrary = vi.fn();
      const { result: hook } = renderWithContext({ library: [target, bystander], setLibrary });

      await act(async () => {
        await hook.current.batchUpdateSongsMetadata(['/a.mp3'], { artist: 'New' });
      });

      const newLib: MetadataType[] = setLibrary.mock.calls[0][0];
      expect(newLib.find((s) => s.path === '/other.mp3')?.artist).toBe('Bystander');
    });

    it('seeds the image cache and sets library image for all songs when art is replaced', async () => {
      const songA = makeSong({ path: '/a.mp3' });
      const songB = makeSong({ path: '/b.mp3' });
      mockInvoke
        .mockResolvedValueOnce({ ...songA, image: 'data:new' })
        .mockResolvedValueOnce({ ...songB, image: 'data:new' });

      const setLibrary = vi.fn();
      const { result: hook } = renderWithContext({ library: [songA, songB], setLibrary });

      await act(async () => {
        await hook.current.batchUpdateSongsMetadata(['/a.mp3', '/b.mp3'], { coverArtPath: '/cover.jpg' });
      });

      expect(mockUpdateCachedArt).toHaveBeenCalledWith('/a.mp3', 'data:new');
      expect(mockUpdateCachedArt).toHaveBeenCalledWith('/b.mp3', 'data:new');
      const newLib: MetadataType[] = setLibrary.mock.calls[0][0];
      expect(newLib.find((s) => s.path === '/a.mp3')?.image).toBe('data:new');
      expect(newLib.find((s) => s.path === '/b.mp3')?.image).toBe('data:new');
    });

    it('invalidates cache and clears image for all songs when removeCoverArt is true', async () => {
      const songA = makeSong({ path: '/a.mp3', image: 'data:old' });
      const songB = makeSong({ path: '/b.mp3', image: 'data:old' });
      mockInvoke
        .mockResolvedValueOnce({ ...songA, image: undefined })
        .mockResolvedValueOnce({ ...songB, image: undefined });

      const setLibrary = vi.fn();
      const { result: hook } = renderWithContext({ library: [songA, songB], setLibrary });

      await act(async () => {
        await hook.current.batchUpdateSongsMetadata(['/a.mp3', '/b.mp3'], { removeCoverArt: true });
      });

      expect(mockInvalidateCachedArt).toHaveBeenCalledWith('/a.mp3');
      expect(mockInvalidateCachedArt).toHaveBeenCalledWith('/b.mp3');
      const newLib: MetadataType[] = setLibrary.mock.calls[0][0];
      expect(newLib.find((s) => s.path === '/a.mp3')?.image).toBeUndefined();
      expect(newLib.find((s) => s.path === '/b.mp3')?.image).toBeUndefined();
    });

    it('updates now-playing metadata when the playing song is in the batch', async () => {
      const playing = makeSong({ path: '/a.mp3', artist: 'Old' });
      const other = makeSong({ path: '/b.mp3', artist: 'Old' });
      mockInvoke
        .mockResolvedValueOnce({ ...playing, artist: 'New' })
        .mockResolvedValueOnce({ ...other, artist: 'New' });

      const setMetadata = vi.fn();
      const { result: hook } = renderWithContext({
        library: [playing, other],
        metadata: playing,
        setMetadata,
      });

      await act(async () => {
        await hook.current.batchUpdateSongsMetadata(['/a.mp3', '/b.mp3'], { artist: 'New' });
      });

      expect(setMetadata).toHaveBeenCalledWith(expect.objectContaining({ path: '/a.mp3', artist: 'New' }));
    });

    it('does not call setMetadata when none of the batch songs are currently playing', async () => {
      const songA = makeSong({ path: '/a.mp3' });
      const nowPlaying = makeSong({ path: '/playing.mp3' });
      mockInvoke.mockResolvedValueOnce({ ...songA, artist: 'New' });

      const setMetadata = vi.fn();
      const { result: hook } = renderWithContext({
        library: [songA],
        metadata: nowPlaying,
        setMetadata,
      });

      await act(async () => {
        await hook.current.batchUpdateSongsMetadata(['/a.mp3'], { artist: 'New' });
      });

      expect(setMetadata).not.toHaveBeenCalled();
    });

    it('updates the playback queue when a song in the batch is renamed', async () => {
      const song = makeSong({ path: '/old.mp3' });
      mockInvoke.mockResolvedValueOnce({ ...song, path: '/new.mp3' });

      const setCurrentPlaylist = vi.fn();
      const { result: hook } = renderWithContext({
        library: [song],
        currentPlaylist: ['/old.mp3', '/other.mp3'],
        setCurrentPlaylist,
      });

      await act(async () => {
        await hook.current.batchUpdateSongsMetadata(['/old.mp3'], {});
      });

      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/new.mp3', '/other.mp3']);
    });

    it('does not call setCurrentPlaylist when no paths change', async () => {
      const song = makeSong({ path: '/a.mp3' });
      mockInvoke.mockResolvedValueOnce({ ...song });

      const setCurrentPlaylist = vi.fn();
      const { result: hook } = renderWithContext({
        library: [song],
        currentPlaylist: ['/a.mp3'],
        setCurrentPlaylist,
      });

      await act(async () => {
        await hook.current.batchUpdateSongsMetadata(['/a.mp3'], { artist: 'New' });
      });

      expect(setCurrentPlaylist).not.toHaveBeenCalled();
    });
  });
});
