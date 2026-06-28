import { fireEvent, waitFor, act, screen } from '@testing-library/react';
import { LyricsSearchModal } from './LyricsSearchModal';
import { renderWithContext } from '../../test/helpers';
import { MetadataType, LyricsTrackResponse } from '../../types';
import { useLrclibLyrics } from '../../hooks/useLrclibLyrics';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../../hooks/useLrclibLyrics', () => ({
  useLrclibLyrics: vi.fn(),
}));

vi.mock('../../logger', () => ({
  error: vi.fn().mockResolvedValue(undefined),
}));

const mockUseLrclibLyrics = vi.mocked(useLrclibLyrics);

const mockSong: MetadataType = {
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  path: '/music/test.mp3',
};

const mockTracks: LyricsTrackResponse[] = [
  {
    id: 1,
    trackName: 'Track 1',
    artistName: 'Artist 1',
    albumName: 'Album 1',
    duration: 180,
    instrumental: false,
    plainLyrics: 'Plain lyrics',
    syncedLyrics: '[00:00]Synced lyrics',
  },
  {
    id: 2,
    trackName: 'Track 2',
    artistName: 'Artist 2',
    albumName: 'Album 2',
    duration: 200,
    instrumental: true,
    plainLyrics: null,
    syncedLyrics: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseLrclibLyrics.mockReturnValue({
    searchLyrics: vi.fn().mockResolvedValue(mockTracks),
    downloadLyrics: vi.fn().mockResolvedValue(undefined),
    getLyricsById: vi.fn(),
    getLyricsPreview: vi.fn(),
  });
});

describe('LyricsSearchModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { queryByRole } = renderWithContext(<LyricsSearchModal isOpen={false} onClose={vi.fn()} song={mockSong} />);
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('performs initial search when modal opens', async () => {
    renderWithContext(<LyricsSearchModal isOpen onClose={vi.fn()} song={mockSong} />);
    await waitFor(() => expect(mockUseLrclibLyrics().searchLyrics).toHaveBeenCalled());
  });

  it('shows search results', async () => {
    renderWithContext(<LyricsSearchModal isOpen onClose={vi.fn()} song={mockSong} />);
    await screen.findByText('Track 1');
    await screen.findByText('Artist 1');
  });

  it('shows instrumental badge for instrumental tracks', async () => {
    renderWithContext(<LyricsSearchModal isOpen onClose={vi.fn()} song={mockSong} />);
    await screen.findByText('Instrumental');
  });

  it('shows synced and plain badges for tracks with both', async () => {
    renderWithContext(<LyricsSearchModal isOpen onClose={vi.fn()} song={mockSong} />);
    await screen.findByText('Synced');
    await screen.findByText('Plain');
  });

  it('disables download button for instrumental-only tracks', async () => {
    renderWithContext(<LyricsSearchModal isOpen onClose={vi.fn()} song={mockSong} />);
    await screen.findByRole('button', { name: /Instrumental only/i });
    const button = screen.getByRole('button', { name: /Instrumental only/i });
    expect(button).toBeDisabled();
  });

  it('calls downloadLyrics when synced download button is clicked', async () => {
    renderWithContext(<LyricsSearchModal isOpen onClose={vi.fn()} song={mockSong} />);
    await screen.findByText('Synced');
    const downloadBtn = screen.getByRole('button', { name: /Synced/i });
    fireEvent.click(downloadBtn);
    await waitFor(() =>
      expect(mockUseLrclibLyrics().downloadLyrics).toHaveBeenCalledWith(
        expect.objectContaining({
          songPath: mockSong.path,
          trackId: 1,
          preferSynced: true,
          plainLyrics: 'Plain lyrics',
          syncedLyrics: '[00:00]Synced lyrics',
        }),
      ),
    );
  });

  it('calls onClose after successful download', async () => {
    const onClose = vi.fn();
    renderWithContext(<LyricsSearchModal isOpen onClose={onClose} song={mockSong} />);
    await screen.findByText('Synced');
    const downloadBtn = screen.getByRole('button', { name: /Synced/i });
    fireEvent.click(downloadBtn);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows error message when search fails', async () => {
    mockUseLrclibLyrics.mockReturnValue({
      searchLyrics: vi.fn().mockRejectedValue(new Error('API Error')),
      downloadLyrics: vi.fn(),
      getLyricsById: vi.fn(),
      getLyricsPreview: vi.fn(),
    });
    renderWithContext(<LyricsSearchModal isOpen onClose={vi.fn()} song={mockSong} />);
    await screen.findByText(/Search failed/);
  });

  it('allows manual search with custom query', async () => {
    renderWithContext(<LyricsSearchModal isOpen onClose={vi.fn()} song={mockSong} />);
    await waitFor(() => expect(mockUseLrclibLyrics().searchLyrics).toHaveBeenCalled());

    const input = screen.getByPlaceholderText('Track, artist, album...');
    act(() => {
      fireEvent.change(input, { target: { value: 'custom query' } });
    });

    const searchBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchBtn);

    await waitFor(() =>
      expect(mockUseLrclibLyrics().searchLyrics).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'custom query' }),
      ),
    );
  });

  it('does not search when query is empty and no song metadata', async () => {
    const emptySong: MetadataType = { title: '', artist: '', album: '', path: '' };
    renderWithContext(<LyricsSearchModal isOpen onClose={vi.fn()} song={emptySong} />);

    const searchBtn = screen.getByRole('button', { name: /Search/i });
    expect(searchBtn).toBeDisabled();
  });

  it('resets initialSearchDone when modal closes', async () => {
    const { rerender } = renderWithContext(<LyricsSearchModal isOpen onClose={vi.fn()} song={mockSong} />);
    await waitFor(() => expect(mockUseLrclibLyrics().searchLyrics).toHaveBeenCalledTimes(1));

    rerender(<LyricsSearchModal isOpen={false} onClose={vi.fn()} song={mockSong} />);

    rerender(<LyricsSearchModal isOpen onClose={vi.fn()} song={mockSong} />);
    await waitFor(() => expect(mockUseLrclibLyrics().searchLyrics).toHaveBeenCalledTimes(2));
  });
});
