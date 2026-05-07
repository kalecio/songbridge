import { fireEvent, waitFor, act } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import Volume from './Volume';
import { renderWithContext } from '../../test/helpers';
import { PlaylistType } from '../../types';
import { FAVOURITES_PLAYLIST_ID } from '../../hooks/useFavourites';
import { AUDIO_EVENTS } from '../../audioEvents';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const mockInvoke = vi.mocked(invoke);

describe('Volume', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  it('shows the VolumeHigh icon at the default volume (70)', () => {
    const { getByLabelText } = renderWithContext(<Volume />);
    expect(getByLabelText('volume-high')).toBeInTheDocument();
  });

  it('shows VolumeOff icon when volume is below 33', () => {
    const { getByRole, getByLabelText } = renderWithContext(<Volume />);
    const slider = getByRole('slider');
    fireEvent.change(slider, { target: { value: '10' } });
    expect(getByLabelText('volume-off')).toBeInTheDocument();
  });

  it('shows VolumeLow icon when volume is between 33 and 65', () => {
    const { getByRole, getByLabelText } = renderWithContext(<Volume />);
    const slider = getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });
    expect(getByLabelText('volume-low')).toBeInTheDocument();
  });

  it('calls set_volume with value / 100 when slider changes', () => {
    const { getByRole } = renderWithContext(<Volume />);
    fireEvent.change(getByRole('slider'), { target: { value: '40' } });
    expect(mockInvoke).toHaveBeenCalledWith('set_volume', { volume: 0.4 });
  });

  it('shows VolumeXmark and calls toggle_mute when volume icon is clicked', async () => {
    const { getByLabelText } = renderWithContext(<Volume />);
    fireEvent.click(getByLabelText('volume-high'));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('toggle_mute');
      expect(getByLabelText('volume-muted')).toBeInTheDocument();
    });
  });

  it('restores the volume icon when VolumeXmark is clicked again', async () => {
    const { getByLabelText } = renderWithContext(<Volume />);
    fireEvent.click(getByLabelText('volume-high'));
    await waitFor(() => expect(getByLabelText('volume-muted')).toBeInTheDocument());
    fireEvent.click(getByLabelText('volume-muted'));
    await waitFor(() => expect(getByLabelText('volume-high')).toBeInTheDocument());
  });

  it('toggles mute when the AUDIO_EVENTS.mute event is dispatched', async () => {
    const { getByLabelText } = renderWithContext(<Volume />);
    expect(getByLabelText('volume-high')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent(AUDIO_EVENTS.mute));
    });
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('toggle_mute');
      expect(getByLabelText('volume-muted')).toBeInTheDocument();
    });
  });

  it('marks the heart as disabled when no song is playing', () => {
    const { getByLabelText } = renderWithContext(<Volume />);
    expect(getByLabelText('add to favourites')).toHaveAttribute('aria-disabled', 'true');
  });

  it('adds the current song to the Favourites playlist on first click', () => {
    let playlists: PlaylistType[] = [];
    const setPlaylists = vi.fn((updater) => {
      playlists = typeof updater === 'function' ? updater(playlists) : updater;
    });
    const { getByLabelText } = renderWithContext(<Volume />, {
      currentPath: '/music/a.mp3',
      metadata: { title: 'Track A', artist: 'Artist', path: '/music/a.mp3' },
      playlists,
      setPlaylists,
    });

    fireEvent.click(getByLabelText('add to favourites'));

    expect(setPlaylists).toHaveBeenCalled();
    const favs = playlists.find((p) => p.id === FAVOURITES_PLAYLIST_ID);
    expect(favs).toBeDefined();
    expect(favs!.songs).toHaveLength(1);
    expect(favs!.songs[0].path).toBe('/music/a.mp3');
  });

  it('removes the current song from Favourites when toggled off', () => {
    const initial: PlaylistType[] = [
      {
        id: FAVOURITES_PLAYLIST_ID,
        name: 'Favourites',
        songs: [{ title: 'Track A', path: '/music/a.mp3' }],
      },
    ];
    let nextPlaylists: PlaylistType[] = initial;
    const setPlaylists = vi.fn((updater) => {
      nextPlaylists = typeof updater === 'function' ? updater(initial) : updater;
    });

    const { getByLabelText } = renderWithContext(<Volume />, {
      currentPath: '/music/a.mp3',
      metadata: { title: 'Track A', path: '/music/a.mp3' },
      playlists: initial,
      setPlaylists,
    });

    expect(getByLabelText('remove from favourites')).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      fireEvent.click(getByLabelText('remove from favourites'));
    });

    expect(setPlaylists).toHaveBeenCalled();
    expect(nextPlaylists.find((p) => p.id === FAVOURITES_PLAYLIST_ID)!.songs).toHaveLength(0);
  });
});
