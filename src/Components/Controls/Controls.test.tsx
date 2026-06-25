import { act, fireEvent, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import Controls from './Controls';
import { renderWithContext } from '../../test/helpers';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const mockInvoke = vi.mocked(invoke);

describe('Controls', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);
  });

  it('shows the Play button when not playing', () => {
    const { getByLabelText, queryByLabelText } = renderWithContext(<Controls />, { isPlaying: false });
    expect(getByLabelText('play')).toBeInTheDocument();
    expect(queryByLabelText('pause')).not.toBeInTheDocument();
  });

  it('shows the Pause button when playing', () => {
    const { getByLabelText, queryByLabelText } = renderWithContext(<Controls />, { isPlaying: true });
    expect(getByLabelText('pause')).toBeInTheDocument();
    expect(queryByLabelText('play')).not.toBeInTheDocument();
  });

  it('advances to the next song in order when Next is clicked', async () => {
    const setCurrentPath = vi.fn();
    const { getByLabelText } = renderWithContext(<Controls />, {
      currentPlaylist: ['a.mp3', 'b.mp3', 'c.mp3'],
      currentPath: 'a.mp3',
      setCurrentPath,
    });
    await act(async () => {}); // flush playNewSong microtasks from path effect
    fireEvent.click(getByLabelText('next'));
    expect(setCurrentPath).toHaveBeenCalledWith('b.mp3');
  });

  it('wraps from the last song back to the first on Next', async () => {
    const setCurrentPath = vi.fn();
    const { getByLabelText } = renderWithContext(<Controls />, {
      currentPlaylist: ['a.mp3', 'b.mp3'],
      currentPath: 'b.mp3',
      setCurrentPath,
    });
    await act(async () => {});
    fireEvent.click(getByLabelText('next'));
    expect(setCurrentPath).toHaveBeenCalledWith('a.mp3');
  });

  it('goes to the previous song when Prev is clicked', async () => {
    const setCurrentPath = vi.fn();
    const { getByLabelText } = renderWithContext(<Controls />, {
      currentPlaylist: ['a.mp3', 'b.mp3', 'c.mp3'],
      currentPath: 'c.mp3',
      setCurrentPath,
    });
    await act(async () => {});
    fireEvent.click(getByLabelText('previous'));
    expect(setCurrentPath).toHaveBeenCalledWith('b.mp3');
  });

  it('wraps from the first song to the last on Prev', async () => {
    const setCurrentPath = vi.fn();
    const { getByLabelText } = renderWithContext(<Controls />, {
      currentPlaylist: ['a.mp3', 'b.mp3'],
      currentPath: 'a.mp3',
      setCurrentPath,
    });
    await act(async () => {});
    fireEvent.click(getByLabelText('previous'));
    expect(setCurrentPath).toHaveBeenCalledWith('b.mp3');
  });

  it('picks a random song when shuffle is on and Next is clicked', async () => {
    // Math.floor(0.99 * 3) = 2 → index 2 → 'c.mp3'
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const setCurrentPath = vi.fn();
    const { getByLabelText } = renderWithContext(<Controls />, {
      currentPlaylist: ['a.mp3', 'b.mp3', 'c.mp3'],
      currentPath: 'a.mp3',
      setCurrentPath,
      onShuffle: true,
    });
    await act(async () => {});
    fireEvent.click(getByLabelText('next'));
    expect(setCurrentPath).toHaveBeenCalledWith('c.mp3');
    vi.restoreAllMocks();
  });

  it('calls setOnShuffle with the toggled value when Shuffle is clicked', () => {
    const setOnShuffle = vi.fn();
    const { getByLabelText } = renderWithContext(<Controls />, {
      onShuffle: false,
      setOnShuffle,
    });
    fireEvent.click(getByLabelText('shuffle'));
    expect(setOnShuffle).toHaveBeenCalledWith(true);
  });

  it('calls setOnRepeat with the next mode when Repeat is clicked (none -> one)', () => {
    const setOnRepeat = vi.fn();
    const { getByLabelText } = renderWithContext(<Controls />, {
      onRepeat: 'none',
      setOnRepeat,
    });
    fireEvent.click(getByLabelText('repeat'));
    expect(setOnRepeat).toHaveBeenCalledWith('one');
  });

  it('calls setOnRepeat with the next mode when Repeat is clicked (one -> all)', () => {
    const setOnRepeat = vi.fn();
    const { getByLabelText } = renderWithContext(<Controls />, {
      onRepeat: 'one',
      setOnRepeat,
    });
    fireEvent.click(getByLabelText('repeat'));
    expect(setOnRepeat).toHaveBeenCalledWith('all');
  });

  it('calls setOnRepeat with the next mode when Repeat is clicked (all -> none)', () => {
    const setOnRepeat = vi.fn();
    const { getByLabelText } = renderWithContext(<Controls />, {
      onRepeat: 'all',
      setOnRepeat,
    });
    fireEvent.click(getByLabelText('repeat'));
    expect(setOnRepeat).toHaveBeenCalledWith('none');
  });

  it('invokes pause and sets isPlaying to false when Pause is clicked', async () => {
    const setIsPlaying = vi.fn();
    const { getByLabelText } = renderWithContext(<Controls />, {
      isPlaying: true,
      setIsPlaying,
    });
    fireEvent.click(getByLabelText('pause'));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('pause');
      expect(setIsPlaying).toHaveBeenCalledWith(false);
    });
  });

  it('does not invoke load_song or play_song when currentPath is undefined on mount', async () => {
    renderWithContext(<Controls />, { currentPath: undefined });
    await act(async () => {});
    expect(mockInvoke).not.toHaveBeenCalledWith('load_song', expect.anything());
    expect(mockInvoke).not.toHaveBeenCalledWith('play_song');
  });

  describe('time display', () => {
    const renderWithTime = (progress: number, totalSeconds: number) =>
      renderWithContext(<Controls />, {
        progress,
        metadata: { duration: { duration_seconds: totalSeconds } },
        currentPath: undefined,
      });

    it('shows mm:ss for songs under one hour', () => {
      const { getByText } = renderWithTime(50, 120); // 1:00 / 2:00
      expect(getByText('1:00 / 2:00')).toBeInTheDocument();
    });

    it('shows h:mm:ss for songs one hour or longer', () => {
      // 3660s = 1h 1m, 50% = 1830s = 30m 30s
      const { getByText } = renderWithTime(50, 3660);
      expect(getByText('30:30 / 1:01:00')).toBeInTheDocument();
    });

    it('shows zero time when no metadata duration', () => {
      const { getByText } = renderWithContext(<Controls />, {
        progress: 0,
        metadata: undefined,
        currentPath: undefined,
      });
      expect(getByText('0:00 / 0:00')).toBeInTheDocument();
    });

    it('updates current time as progress changes', () => {
      const { getByText } = renderWithTime(0, 180); // 0:00 / 3:00
      expect(getByText('0:00 / 3:00')).toBeInTheDocument();
      // re-render with new props
      const { getByText: getByText2 } = renderWithTime(50, 180);
      expect(getByText2('1:30 / 3:00')).toBeInTheDocument();
    });
  });
});
