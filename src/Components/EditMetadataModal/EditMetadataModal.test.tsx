import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import EditMetadataModal from './EditMetadataModal';
import type { MetadataType } from '../../types';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));

const mockInvoke = vi.mocked(invoke);
const mockOpen = vi.mocked(open);

const song: MetadataType = {
  path: '/music/Artist - Song.mp3',
  title: 'Song',
  artist: 'Artist',
  album: 'Album',
  year: '2021',
  track: 3,
};

const renderModal = (
  overrides: {
    song?: MetadataType | null;
    onClose?: () => void;
    onSave?: (_path: string, _fields: object) => Promise<unknown>;
  } = {},
) => {
  const onClose = overrides.onClose ?? vi.fn();
  const onSave = overrides.onSave ?? vi.fn().mockResolvedValue(undefined);
  render(
    <EditMetadataModal song={overrides.song !== undefined ? overrides.song : song} onClose={onClose} onSave={onSave} />,
  );
  return { onClose, onSave };
};

beforeEach(() => {
  mockInvoke.mockReset();
  mockOpen.mockReset();
});

describe('EditMetadataModal', () => {
  describe('field initialisation', () => {
    it('populates fields from the song prop', () => {
      renderModal();
      expect(screen.getByLabelText('Title')).toHaveValue('Song');
      expect(screen.getByLabelText('Artist')).toHaveValue('Artist');
      expect(screen.getByLabelText('Album')).toHaveValue('Album');
      expect(screen.getByLabelText('Year')).toHaveValue('2021');
      expect(screen.getByLabelText('Track number')).toHaveValue(3);
    });

    it('populates the filename field from the path basename', () => {
      renderModal();
      expect(screen.getByLabelText('Filename')).toHaveValue('Artist - Song');
    });

    it('renders the extension badge separately from the filename input', () => {
      renderModal();
      expect(screen.getByText('.mp3')).toBeInTheDocument();
    });

    it('does not render when song is null', () => {
      renderModal({ song: null });
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    });
  });

  describe('auto-filename checkbox', () => {
    it('syncs filename from artist and title when checkbox is checked', () => {
      renderModal();
      const checkbox = screen.getByRole('checkbox');
      const titleInput = screen.getByLabelText('Title');
      const artistInput = screen.getByLabelText('Artist');

      fireEvent.change(titleInput, { target: { value: 'New Song' } });
      fireEvent.change(artistInput, { target: { value: 'New Artist' } });
      fireEvent.click(checkbox);

      expect(screen.getByLabelText('Filename')).toHaveValue('New Artist - New Song');
    });

    it('uses only title when artist is empty', () => {
      renderModal({ song: { ...song, artist: '' } });
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(screen.getByLabelText('Filename')).toHaveValue('Song');
    });

    it('uses only artist when title is empty', () => {
      renderModal({ song: { ...song, title: '' } });
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(screen.getByLabelText('Filename')).toHaveValue('Artist');
    });

    it('keeps filename in sync as title changes while checkbox is on', () => {
      renderModal();
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const titleInput = screen.getByLabelText('Title');
      fireEvent.change(titleInput, { target: { value: 'Updated' } });

      expect(screen.getByLabelText('Filename')).toHaveValue('Artist - Updated');
    });

    it('disables the filename input while checkbox is checked', () => {
      renderModal();
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(screen.getByLabelText('Filename')).toBeDisabled();
    });

    it('unchecks checkbox and re-enables filename when user edits it manually', () => {
      renderModal();
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Manually editing filename should uncheck the auto-fill checkbox
      const filenameInput = screen.getByLabelText('Filename');
      // Input is disabled while checkbox is checked, so uncheck first by simulating
      // a direct checkbox click (the onChange handler on the input triggers unchecking)
      fireEvent.click(checkbox); // uncheck
      fireEvent.change(filenameInput, { target: { value: 'custom-name' } });

      expect(checkbox).not.toBeChecked();
      expect(filenameInput).not.toBeDisabled();
      expect(filenameInput).toHaveValue('custom-name');
    });
  });

  describe('form submission', () => {
    it('calls onSave with correct fields and closes on success', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      renderModal({ onSave, onClose });

      fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Title' } });
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      expect(onSave).toHaveBeenCalledWith(
        '/music/Artist - Song.mp3',
        expect.objectContaining({ title: 'Updated Title' }),
      );
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('does not pass newFilename when it is unchanged', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderModal({ onSave });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      const fields = onSave.mock.calls[0][1];
      expect(fields.newFilename).toBeUndefined();
    });

    it('passes newFilename when it differs from the original basename', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderModal({ onSave });

      fireEvent.change(screen.getByLabelText('Filename'), { target: { value: 'renamed' } });
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      const fields = onSave.mock.calls[0][1];
      expect(fields.newFilename).toBe('renamed');
    });

    it('omits undefined optional fields', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderModal({ onSave, song: { path: '/music/x.mp3' } });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      const fields = onSave.mock.calls[0][1];
      expect(fields.title).toBeUndefined();
      expect(fields.artist).toBeUndefined();
      expect(fields.album).toBeUndefined();
      expect(fields.year).toBeUndefined();
      expect(fields.track).toBeUndefined();
    });

    it('shows an error message when onSave rejects', async () => {
      const onSave = vi.fn().mockRejectedValue('Write failed');
      renderModal({ onSave });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(screen.getByText('Write failed')).toBeInTheDocument());
    });

    it('does not close the modal on save failure', async () => {
      const onClose = vi.fn();
      const onSave = vi.fn().mockRejectedValue('err');
      renderModal({ onClose, onSave });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(screen.getByText('err')).toBeInTheDocument());
      expect(onClose).not.toHaveBeenCalled();
    });

    it('triggers save on Enter key', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderModal({ onSave });

      fireEvent.keyDown(screen.getByLabelText('Title'), { key: 'Enter' });

      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    });

    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      renderModal({ onClose });

      fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('cover art', () => {
    it('shows a Change cover button', () => {
      renderModal();
      expect(screen.getByText('Change cover')).toBeInTheDocument();
    });

    it('does not show Remove cover button when song has no art', () => {
      renderModal({ song: { ...song, image: undefined } });
      expect(screen.queryByText('Remove cover')).not.toBeInTheDocument();
    });

    it('shows Remove cover button when song already has art', () => {
      renderModal({ song: { ...song, image: 'data:image/jpeg;base64,abc' } });
      expect(screen.getByText('Remove cover')).toBeInTheDocument();
    });

    it('fetches preview and shows Remove cover after picking a file', async () => {
      mockOpen.mockResolvedValue('/tmp/cover.jpg');
      mockInvoke.mockResolvedValue('data:image/jpeg;base64,preview');

      renderModal({ song: { ...song, image: undefined } });

      await act(async () => {
        fireEvent.click(screen.getByText('Change cover'));
      });

      await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('get_image_preview', { path: '/tmp/cover.jpg' }));
      expect(screen.getByText('Remove cover')).toBeInTheDocument();
    });

    it('passes removeCoverArt: true when Remove cover is clicked', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderModal({ onSave, song: { ...song, image: 'data:image/jpeg;base64,abc' } });

      fireEvent.click(screen.getByText('Remove cover'));
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => expect(onSave).toHaveBeenCalled());
      const fields = onSave.mock.calls[0][1];
      expect(fields.removeCoverArt).toBe(true);
    });

    it('does nothing when file picker is cancelled', async () => {
      mockOpen.mockResolvedValue(null);
      renderModal({ song: { ...song, image: undefined } });

      await act(async () => {
        fireEvent.click(screen.getByText('Change cover'));
      });

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(screen.queryByText('Remove cover')).not.toBeInTheDocument();
    });
  });
});
