import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import EditGroupMetadataModal from './EditGroupMetadataModal';
import type { MetadataType } from '../../types';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));

const mockInvoke = vi.mocked(invoke);
const mockOpen = vi.mocked(open);

const albumSongs: MetadataType[] = [
  { path: '/music/01.mp3', title: 'Track 1', artist: 'The Band', album: 'Great Album', year: '2022' },
  { path: '/music/02.mp3', title: 'Track 2', artist: 'The Band', album: 'Great Album', year: '2022' },
];

const artistSongs: MetadataType[] = [
  { path: '/music/a.mp3', title: 'Song A', artist: 'Solo Artist', album: 'Album A', year: '2021' },
  { path: '/music/b.mp3', title: 'Song B', artist: 'Solo Artist', album: 'Album B', year: '2023' },
];

const renderAlbumModal = (
  overrides: {
    songs?: MetadataType[] | null;
    onClose?: () => void;
    onSave?: (_fields: object) => Promise<void>;
  } = {},
) => {
  const onClose = overrides.onClose ?? vi.fn();
  const onSave = overrides.onSave ?? vi.fn().mockResolvedValue(undefined);
  render(
    <EditGroupMetadataModal
      groupType="album"
      songs={overrides.songs !== undefined ? overrides.songs : albumSongs}
      onClose={onClose}
      onSave={onSave}
    />,
  );
  return { onClose, onSave };
};

const renderArtistModal = (
  overrides: {
    songs?: MetadataType[] | null;
    onClose?: () => void;
    onSave?: (_fields: object) => Promise<void>;
  } = {},
) => {
  const onClose = overrides.onClose ?? vi.fn();
  const onSave = overrides.onSave ?? vi.fn().mockResolvedValue(undefined);
  render(
    <EditGroupMetadataModal
      groupType="artist"
      songs={overrides.songs !== undefined ? overrides.songs : artistSongs}
      onClose={onClose}
      onSave={onSave}
    />,
  );
  return { onClose, onSave };
};

beforeEach(() => {
  mockInvoke.mockReset();
  mockOpen.mockReset();
});

describe('EditGroupMetadataModal', () => {
  describe('album mode — field initialisation', () => {
    it('pre-fills artist, album, and year from songs[0]', () => {
      renderAlbumModal();
      expect(screen.getByLabelText('Artist')).toHaveValue('The Band');
      expect(screen.getByLabelText('Album')).toHaveValue('Great Album');
      expect(screen.getByLabelText('Year')).toHaveValue('2022');
    });

    it('shows the album name in the modal title', () => {
      renderAlbumModal();
      expect(screen.getByText(/Edit album — Great Album/)).toBeInTheDocument();
    });

    it('shows the song count in the subtitle', () => {
      renderAlbumModal();
      expect(screen.getByText('2 songs will be updated')).toBeInTheDocument();
    });

    it('uses singular "song" for a single-song album', () => {
      renderAlbumModal({ songs: [albumSongs[0]] });
      expect(screen.getByText('1 song will be updated')).toBeInTheDocument();
    });

    it('renders the cover art section', () => {
      renderAlbumModal();
      expect(screen.getByText('Change cover')).toBeInTheDocument();
    });

    it('renders the album and year fields', () => {
      renderAlbumModal();
      expect(screen.getByLabelText('Album')).toBeInTheDocument();
      expect(screen.getByLabelText('Year')).toBeInTheDocument();
    });
  });

  describe('artist mode — field initialisation', () => {
    it('pre-fills artist from songs[0]', () => {
      renderArtistModal();
      expect(screen.getByLabelText('Artist')).toHaveValue('Solo Artist');
    });

    it('shows the artist name in the modal title', () => {
      renderArtistModal();
      expect(screen.getByText(/Edit artist — Solo Artist/)).toBeInTheDocument();
    });

    it('does not render the cover art section', () => {
      renderArtistModal();
      expect(screen.queryByText('Change cover')).not.toBeInTheDocument();
    });

    it('does not render album or year fields', () => {
      renderArtistModal();
      expect(screen.queryByLabelText('Album')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Year')).not.toBeInTheDocument();
    });
  });

  describe('closed state', () => {
    it('does not render when songs is null', () => {
      renderAlbumModal({ songs: null });
      expect(screen.queryByLabelText('Artist')).not.toBeInTheDocument();
    });

    it('does not render when songs is an empty array', () => {
      renderAlbumModal({ songs: [] });
      expect(screen.queryByLabelText('Artist')).not.toBeInTheDocument();
    });
  });

  describe('album mode — form submission', () => {
    it('calls onSave with artist, album, year, and removeCoverArt', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderAlbumModal({ onSave });

      fireEvent.change(screen.getByLabelText('Artist'), { target: { value: 'Updated Band' } });
      fireEvent.change(screen.getByLabelText('Album'), { target: { value: 'Updated Album' } });
      fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } });
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          artist: 'Updated Band',
          album: 'Updated Album',
          year: '2024',
          removeCoverArt: false,
        }),
      );
    });

    it('sends undefined for blank fields rather than empty strings', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderAlbumModal({ onSave, songs: [{ path: '/a.mp3' }] });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      const fields = onSave.mock.calls[0][0];
      expect(fields.artist).toBeUndefined();
      expect(fields.album).toBeUndefined();
      expect(fields.year).toBeUndefined();
    });

    it('calls onClose after a successful save', async () => {
      const onClose = vi.fn();
      renderAlbumModal({ onClose, onSave: vi.fn().mockResolvedValue(undefined) });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('shows an error and keeps the modal open when onSave rejects', async () => {
      const onClose = vi.fn();
      renderAlbumModal({ onClose, onSave: vi.fn().mockRejectedValue('Write error') });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(screen.getByText('Write error')).toBeInTheDocument());
      expect(onClose).not.toHaveBeenCalled();
    });

    it('triggers save on Enter key press', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderAlbumModal({ onSave });

      fireEvent.keyDown(screen.getByLabelText('Artist'), { key: 'Enter' });

      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    });

    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      renderAlbumModal({ onClose });

      fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('artist mode — form submission', () => {
    it('calls onSave with only the artist field', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderArtistModal({ onSave });

      fireEvent.change(screen.getByLabelText('Artist'), { target: { value: 'New Artist' } });
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      const fields = onSave.mock.calls[0][0];
      expect(fields.artist).toBe('New Artist');
      expect(fields.album).toBeUndefined();
      expect(fields.year).toBeUndefined();
      expect(fields.coverArtPath).toBeUndefined();
      expect(fields.removeCoverArt).toBeUndefined();
    });
  });

  describe('album mode — cover art', () => {
    it('shows Remove cover when songs[0] already has embedded art', () => {
      renderAlbumModal({
        songs: [{ ...albumSongs[0], image: 'data:image/jpeg;base64,abc' }, albumSongs[1]],
      });
      expect(screen.getByText('Remove cover')).toBeInTheDocument();
    });

    it('does not show Remove cover when songs have no art', () => {
      renderAlbumModal();
      expect(screen.queryByText('Remove cover')).not.toBeInTheDocument();
    });

    it('fetches a preview and reveals Remove cover after picking a file', async () => {
      mockOpen.mockResolvedValue('/tmp/cover.jpg');
      mockInvoke.mockResolvedValue('data:image/jpeg;base64,preview');

      renderAlbumModal();

      await act(async () => {
        fireEvent.click(screen.getByText('Change cover'));
      });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('get_image_preview', { path: '/tmp/cover.jpg' }));
      expect(screen.getByText('Remove cover')).toBeInTheDocument();
    });

    it('passes removeCoverArt: true when Remove cover is clicked then saved', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderAlbumModal({
        onSave,
        songs: [{ ...albumSongs[0], image: 'data:image/jpeg;base64,abc' }, albumSongs[1]],
      });

      fireEvent.click(screen.getByText('Remove cover'));
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(onSave.mock.calls[0][0].removeCoverArt).toBe(true);
    });

    it('does nothing when the file picker is cancelled', async () => {
      mockOpen.mockResolvedValue(null);
      renderAlbumModal();

      await act(async () => {
        fireEvent.click(screen.getByText('Change cover'));
      });

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(screen.queryByText('Remove cover')).not.toBeInTheDocument();
    });
  });
});
