import { fireEvent, screen } from '@testing-library/react';
import { renderWithContext } from '../../test/helpers';
import Artists from './List';
import { MetadataType } from '../../types';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }));

const library: MetadataType[] = [
  { title: 'Song 1', artist: 'Arctic Monkeys', album: 'AM', path: '/music/1.mp3' },
  { title: 'Song 2', artist: 'Arctic Monkeys', album: 'Humbug', path: '/music/2.mp3' },
  { title: 'Song 3', artist: 'Radiohead', album: 'OK Computer', path: '/music/3.mp3' },
];

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Artists', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('shows a scanning message while the library is loading', () => {
    const { getByText } = renderWithContext(<Artists />, { isScanning: true });
    expect(getByText(/scanning music library/i)).toBeInTheDocument();
  });

  it('shows an empty state when no artists are found', () => {
    const { getByText } = renderWithContext(<Artists />, { library: [] });
    expect(getByText(/no artists found/i)).toBeInTheDocument();
  });

  it('renders a card for each unique artist', () => {
    const { getByText } = renderWithContext(<Artists />, { library });
    expect(getByText('Arctic Monkeys')).toBeInTheDocument();
    expect(getByText('Radiohead')).toBeInTheDocument();
  });

  it('shows the album count for each artist', () => {
    const { getByText } = renderWithContext(<Artists />, { library });
    expect(getByText('2 albums')).toBeInTheDocument();
    expect(getByText('1 album')).toBeInTheDocument();
  });

  it('shows the total artist count in the header', () => {
    const { getByText } = renderWithContext(<Artists />, { library });
    expect(getByText('2')).toBeInTheDocument();
  });

  it('navigates to the artist detail page when a card is clicked', () => {
    const { getByText } = renderWithContext(<Artists />, { library });
    fireEvent.click(getByText('Radiohead').closest('div[class]')!);
    expect(mockNavigate).toHaveBeenCalledWith('/artists/Radiohead');
  });

  it('sorts artists alphabetically', () => {
    const { getAllByText } = renderWithContext(<Artists />, { library });
    const names = getAllByText(/Arctic Monkeys|Radiohead/).map((el) => el.textContent);
    expect(names[0]).toBe('Arctic Monkeys');
    expect(names[1]).toBe('Radiohead');
  });

  describe('context menu — Edit metadata', () => {
    it('shows an "Edit metadata" option in the artist context menu', () => {
      renderWithContext(<Artists />, { library });
      fireEvent.contextMenu(screen.getByText('Radiohead').closest('div[class]')!);
      expect(screen.getByText('Edit metadata')).toBeInTheDocument();
    });

    it('opens the edit modal for the right-clicked artist', () => {
      renderWithContext(<Artists />, { library });
      fireEvent.contextMenu(screen.getByText('Radiohead').closest('div[class]')!);
      fireEvent.click(screen.getByText('Edit metadata'));
      expect(screen.getByText(/Edit artist — Radiohead/)).toBeInTheDocument();
    });

    it('pre-fills the artist name from the artist songs', () => {
      renderWithContext(<Artists />, { library });
      fireEvent.contextMenu(screen.getByText('Radiohead').closest('div[class]')!);
      fireEvent.click(screen.getByText('Edit metadata'));
      expect(screen.getByLabelText('Artist')).toHaveValue('Radiohead');
    });
  });
});
