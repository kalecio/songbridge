import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppContext } from '../../Context/AppContext';
import { DEFAULT_SHORTCUTS } from '../../keyboard';
import { RepeatMode } from '../../types';

// Mock must be before Player import since Player imports @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

import Player from './Player';
import { invoke } from '@tauri-apps/api/core';

const mockInvoke = vi.mocked(invoke);

const defaultContext = {
  onRepeat: 'none' as RepeatMode,
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
  currentPath: '/test/song.mp3',
  metadata: {
    title: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    duration: { duration_seconds: 100, duration_formatted: '1:40' },
    image: undefined,
  },
  setProgress: vi.fn(),
  setCurrentPath: vi.fn(),
  setCurrentPlaylist: vi.fn(),
  setIsPlaying: vi.fn(),
  setOnRepeat: vi.fn(),
  setOnShuffle: vi.fn(),
  setMetadata: vi.fn(),
  setShowQueue: vi.fn(),
  setLibrary: vi.fn(),
  setLibraryPaths: vi.fn(),
  scanLibrary: vi.fn(),
  setIsScanning: vi.fn(),
  setPlaylists: vi.fn(),
  setCurrentTheme: vi.fn(),
  setShortcuts: vi.fn(),
};

const renderWithContext = (overrides = {}) =>
  render(
    <MemoryRouter>
      <AppContext.Provider value={{ ...defaultContext, ...overrides }}>
        <Player />
      </AppContext.Provider>
    </MemoryRouter>,
  );

describe('Player interpolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
  });

  it('renders without crashing when playing', async () => {
    const { unmount } = renderWithContext({
      isPlaying: true,
      metadata: { duration: { duration_seconds: 100 } },
    });

    await waitFor(() => {
      expect(defaultContext.setProgress).toHaveBeenCalled();
    });

    unmount();
  });

  it('updates progress via setProgress when playing', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'get_progress') return Promise.resolve(50);
      return Promise.resolve(undefined);
    });

    const { unmount } = renderWithContext({
      isPlaying: true,
      metadata: { duration: { duration_seconds: 100 } },
    });

    await waitFor(() => {
      expect(defaultContext.setProgress).toHaveBeenCalledWith(expect.any(Number));
    });

    unmount();
  });

  it('resets interpolation state on track change', async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { unmount, rerender } = renderWithContext({
      isPlaying: true,
      metadata: { duration: { duration_seconds: 100 } },
    });

    await waitFor(() => {
      expect(defaultContext.setProgress).toHaveBeenCalled();
    });

    // Simulate track change by re-rendering with new path
    rerender(
      <MemoryRouter>
        <AppContext.Provider
          value={{
            ...defaultContext,
            isPlaying: true,
            currentPath: '/test/new-song.mp3',
            metadata: { duration: { duration_seconds: 100 } },
          }}
        >
          <Player />
        </AppContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(defaultContext.setProgress).toHaveBeenCalledWith(0);
    });

    unmount();
  });
});
