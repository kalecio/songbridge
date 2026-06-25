import { renderHook, act } from '@testing-library/react';
import { AppContext } from '../Context/AppContext';
import { DEFAULT_SHORTCUTS } from '../keyboard';
import { MetadataType } from '../types';
import { useQueueActions } from './useQueueActions';

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

const renderWithContext = (overrides: Partial<AppContextValue> = {}) => {
  const value = { ...baseContext, ...overrides };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
  return renderHook(() => useQueueActions(), { wrapper });
};

describe('useQueueActions', () => {
  describe('playSongs', () => {
    it('sets currentPlaylist to the song paths and starts the first song', () => {
      const setCurrentPlaylist = vi.fn();
      const setCurrentPath = vi.fn();
      const { result } = renderWithContext({ setCurrentPlaylist, setCurrentPath });
      const songs: MetadataType[] = [{ path: '/a.mp3' }, { path: '/b.mp3' }];
      act(() => result.current.playSongs(songs));
      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/a.mp3', '/b.mp3']);
      expect(setCurrentPath).toHaveBeenCalledWith('/a.mp3');
    });

    it('is a no-op when no song has a path', () => {
      const setCurrentPlaylist = vi.fn();
      const setCurrentPath = vi.fn();
      const { result } = renderWithContext({ setCurrentPlaylist, setCurrentPath });
      act(() => result.current.playSongs([{ title: 'No path' }]));
      expect(setCurrentPlaylist).not.toHaveBeenCalled();
      expect(setCurrentPath).not.toHaveBeenCalled();
    });
  });

  describe('addToQueue', () => {
    it('appends new paths to the current queue', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({ currentPlaylist: ['/a.mp3'], setCurrentPlaylist });
      act(() => result.current.addToQueue([{ path: '/b.mp3' }, { path: '/c.mp3' }]));
      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/a.mp3', '/b.mp3', '/c.mp3']);
    });

    it('skips paths already in the queue', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({ currentPlaylist: ['/a.mp3', '/b.mp3'], setCurrentPlaylist });
      act(() => result.current.addToQueue([{ path: '/b.mp3' }, { path: '/c.mp3' }]));
      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/a.mp3', '/b.mp3', '/c.mp3']);
    });

    it('is a no-op when every path is already in the queue', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({ currentPlaylist: ['/a.mp3'], setCurrentPlaylist });
      act(() => result.current.addToQueue([{ path: '/a.mp3' }]));
      expect(setCurrentPlaylist).not.toHaveBeenCalled();
    });
  });

  describe('playNext', () => {
    it('inserts the song right after the currently playing one', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({
        currentPath: '/a.mp3',
        currentPlaylist: ['/a.mp3', '/b.mp3', '/c.mp3'],
        setCurrentPlaylist,
      });
      act(() => result.current.playNext({ path: '/x.mp3' }));
      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/a.mp3', '/x.mp3', '/b.mp3', '/c.mp3']);
    });

    it('moves the song when it is already in the queue', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({
        currentPath: '/a.mp3',
        currentPlaylist: ['/a.mp3', '/b.mp3', '/c.mp3'],
        setCurrentPlaylist,
      });
      act(() => result.current.playNext({ path: '/c.mp3' }));
      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/a.mp3', '/c.mp3', '/b.mp3']);
    });

    it('inserts at index 0 when nothing is playing', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({
        currentPlaylist: ['/a.mp3', '/b.mp3'],
        setCurrentPlaylist,
      });
      act(() => result.current.playNext({ path: '/x.mp3' }));
      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/x.mp3', '/a.mp3', '/b.mp3']);
    });

    it('is a no-op when the song has no path', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({ setCurrentPlaylist });
      act(() => result.current.playNext({ title: 'No path' }));
      expect(setCurrentPlaylist).not.toHaveBeenCalled();
    });
  });

  describe('removeFromQueue', () => {
    it('removes the path from the queue', () => {
      const setCurrentPlaylist = vi.fn();
      const setCurrentPath = vi.fn();
      const { result } = renderWithContext({
        currentPath: '/a.mp3',
        currentPlaylist: ['/a.mp3', '/b.mp3'],
        setCurrentPlaylist,
        setCurrentPath,
      });
      act(() => result.current.removeFromQueue('/b.mp3'));
      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/a.mp3']);
      expect(setCurrentPath).not.toHaveBeenCalled();
    });

    it('clears currentPath when the removed song was playing', () => {
      const setCurrentPlaylist = vi.fn();
      const setCurrentPath = vi.fn();
      const { result } = renderWithContext({
        currentPath: '/a.mp3',
        currentPlaylist: ['/a.mp3', '/b.mp3'],
        setCurrentPlaylist,
        setCurrentPath,
      });
      act(() => result.current.removeFromQueue('/a.mp3'));
      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/b.mp3']);
      expect(setCurrentPath).toHaveBeenCalledWith(undefined);
    });

    it('is a no-op when the path is undefined', () => {
      const setCurrentPlaylist = vi.fn();
      const setCurrentPath = vi.fn();
      const { result } = renderWithContext({ setCurrentPlaylist, setCurrentPath });
      act(() => result.current.removeFromQueue(undefined));
      expect(setCurrentPlaylist).not.toHaveBeenCalled();
      expect(setCurrentPath).not.toHaveBeenCalled();
    });
  });

  describe('reorderQueue', () => {
    it('moves a queued path down', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({
        currentPlaylist: ['/a.mp3', '/b.mp3', '/c.mp3'],
        setCurrentPlaylist,
      });
      act(() => result.current.reorderQueue(0, 2));
      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/b.mp3', '/c.mp3', '/a.mp3']);
    });

    it('moves a queued path up', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({
        currentPlaylist: ['/a.mp3', '/b.mp3', '/c.mp3'],
        setCurrentPlaylist,
      });
      act(() => result.current.reorderQueue(2, 0));
      expect(setCurrentPlaylist).toHaveBeenCalledWith(['/c.mp3', '/a.mp3', '/b.mp3']);
    });

    it('is a no-op when from === to', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({
        currentPlaylist: ['/a.mp3', '/b.mp3'],
        setCurrentPlaylist,
      });
      act(() => result.current.reorderQueue(1, 1));
      expect(setCurrentPlaylist).not.toHaveBeenCalled();
    });

    it('is a no-op when indices are out of range', () => {
      const setCurrentPlaylist = vi.fn();
      const { result } = renderWithContext({
        currentPlaylist: ['/a.mp3', '/b.mp3'],
        setCurrentPlaylist,
      });
      act(() => result.current.reorderQueue(0, 99));
      act(() => result.current.reorderQueue(-1, 0));
      expect(setCurrentPlaylist).not.toHaveBeenCalled();
    });
  });
});
