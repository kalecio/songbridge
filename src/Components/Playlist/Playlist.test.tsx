import { fireEvent, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import Playlist from './Playlist';
import { renderWithContext } from '../../test/helpers';
import { MetadataType } from '../../types';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

const mockInvoke = vi.mocked(invoke);

const songs: MetadataType[] = [
  { title: 'Song A', artist: 'Artist 1', album: 'Album X', path: '/music/a.mp3' },
  { title: 'Song B', artist: 'Artist 2', album: 'Album X', path: '/music/b.mp3' },
];

beforeEach(() => {
  mockInvoke.mockResolvedValue([]);
});

describe('Playlist', () => {
  it('renders all song titles', () => {
    const { getByText } = renderWithContext(<Playlist songs={songs} name="Album X" />);
    expect(getByText('Song A')).toBeInTheDocument();
    expect(getByText('Song B')).toBeInTheDocument();
  });

  it('renders the playlist name', () => {
    const { getByText } = renderWithContext(<Playlist songs={songs} name="My Playlist" />);
    expect(getByText('My Playlist')).toBeInTheDocument();
  });

  it('renders the song count', () => {
    const { getByText } = renderWithContext(<Playlist songs={songs} name="Test" />);
    expect(getByText('2 songs')).toBeInTheDocument();
  });

  it('calls onSongClick with the clicked song', () => {
    const onSongClick = vi.fn();
    const { getByText } = renderWithContext(<Playlist songs={songs} name="Test" onSongClick={onSongClick} />);
    fireEvent.click(getByText('Song A'));
    expect(onSongClick).toHaveBeenCalledWith(songs[0]);
  });

  it('calls onPlayAll when the Play Now button is clicked', () => {
    const onPlayAll = vi.fn();
    const { getByText } = renderWithContext(<Playlist songs={songs} name="Test" onPlayAll={onPlayAll} />);
    fireEvent.click(getByText('Play Now'));
    expect(onPlayAll).toHaveBeenCalledTimes(1);
  });

  it('hides the album image header when type is Library', () => {
    const { queryByRole } = renderWithContext(<Playlist songs={songs} name="Songs" type="Library" />);
    expect(queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the album image header when type is Album', () => {
    const songsWithImage: MetadataType[] = [{ ...songs[0], image: 'data:image/jpeg;base64,abc' }, songs[1]];
    const { getAllByRole } = renderWithContext(<Playlist songs={songsWithImage} name="Album X" type="Album" />);
    expect(getAllByRole('img').length).toBeGreaterThan(0);
  });

  it('applies active styling to the currently playing song path', () => {
    const { getByText } = renderWithContext(<Playlist songs={songs} name="Test" activePath="/music/a.mp3" />);
    const songRow = getByText('Song A').closest('div[class]');
    expect(songRow).toBeInTheDocument();
  });

  it('renders artist names for each song', () => {
    const { getByText } = renderWithContext(<Playlist songs={songs} name="Test" />);
    expect(getByText('Artist 1')).toBeInTheDocument();
    expect(getByText('Artist 2')).toBeInTheDocument();
  });

  describe('missing tracks', () => {
    it('shows a warning icon for missing tracks', async () => {
      mockInvoke.mockResolvedValue(['/music/a.mp3']);
      const { getByTitle } = renderWithContext(<Playlist songs={songs} name="Test" />);
      await waitFor(() => expect(getByTitle('File not found on disk')).toBeInTheDocument());
    });

    it('does not call onSongClick when a missing track is clicked', async () => {
      mockInvoke.mockResolvedValue(['/music/a.mp3']);
      const onSongClick = vi.fn();
      const { getByText } = renderWithContext(<Playlist songs={songs} name="Test" onSongClick={onSongClick} />);
      await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('check_paths_exist', expect.anything()));
      fireEvent.click(getByText('Song A'));
      expect(onSongClick).not.toHaveBeenCalled();
    });

    it('shows a remove button for missing tracks when onRemoveMissing is provided', async () => {
      mockInvoke.mockResolvedValue(['/music/a.mp3']);
      const { getByLabelText } = renderWithContext(<Playlist songs={songs} name="Test" onRemoveMissing={vi.fn()} />);
      await waitFor(() => expect(getByLabelText('Remove missing track Song A')).toBeInTheDocument());
    });

    it('does not show a remove button when onRemoveMissing is not provided', async () => {
      mockInvoke.mockResolvedValue(['/music/a.mp3']);
      const { queryByLabelText } = renderWithContext(<Playlist songs={songs} name="Test" />);
      await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('check_paths_exist', expect.anything()));
      expect(queryByLabelText('Remove missing track Song A')).not.toBeInTheDocument();
    });

    it('calls onRemoveMissing with the song when the remove button is clicked', async () => {
      mockInvoke.mockResolvedValue(['/music/a.mp3']);
      const onRemoveMissing = vi.fn();
      const { getByLabelText } = renderWithContext(
        <Playlist songs={songs} name="Test" onRemoveMissing={onRemoveMissing} />,
      );
      await waitFor(() => expect(getByLabelText('Remove missing track Song A')).toBeInTheDocument());
      fireEvent.click(getByLabelText('Remove missing track Song A'));
      expect(onRemoveMissing).toHaveBeenCalledWith(songs[0]);
    });
  });
});
