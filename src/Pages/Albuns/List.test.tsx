import { fireEvent, screen } from '@testing-library/react';
import { renderWithContext } from '../../test/helpers';
import Albums from './List';
import { MetadataType } from '../../types';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }));

const library: MetadataType[] = [
  { title: 'Track 1', artist: 'Band A', album: 'First Album', path: '/music/1.mp3' },
  { title: 'Track 2', artist: 'Band A', album: 'First Album', path: '/music/2.mp3' },
  { title: 'Track 3', artist: 'Band B', album: 'Second Album', path: '/music/3.mp3' },
];

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Albums', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('shows a scanning message while the library is loading', () => {
    const { getByText } = renderWithContext(<Albums />, { isScanning: true });
    expect(getByText(/scanning music library/i)).toBeInTheDocument();
  });

  it('shows an empty state when no albums are found', () => {
    const { getByText } = renderWithContext(<Albums />, { library: [] });
    expect(getByText(/no albums found/i)).toBeInTheDocument();
  });

  it('renders a card for each unique album', () => {
    const { getByText } = renderWithContext(<Albums />, { library });
    expect(getByText('First Album')).toBeInTheDocument();
    expect(getByText('Second Album')).toBeInTheDocument();
  });

  it('shows the song count for each album', () => {
    const { getByText } = renderWithContext(<Albums />, { library });
    expect(getByText('2 songs')).toBeInTheDocument();
    expect(getByText('1 song')).toBeInTheDocument();
  });

  it('shows the total album count in the header', () => {
    const { getByText } = renderWithContext(<Albums />, { library });
    expect(getByText('2')).toBeInTheDocument();
  });

  it('navigates to the album detail page when a card is clicked', () => {
    const { getByText } = renderWithContext(<Albums />, { library });
    fireEvent.click(getByText('Second Album').closest('div[class]')!);
    expect(mockNavigate).toHaveBeenCalledWith('/albums/Second%20Album');
  });

  it('sorts albums alphabetically', () => {
    const { getAllByText } = renderWithContext(<Albums />, { library });
    const names = getAllByText(/First Album|Second Album/).map((el) => el.textContent);
    expect(names[0]).toBe('First Album');
    expect(names[1]).toBe('Second Album');
  });

  describe('context menu — Edit metadata', () => {
    it('shows an "Edit metadata" option in the album context menu', () => {
      renderWithContext(<Albums />, { library });
      fireEvent.contextMenu(screen.getByText('First Album').closest('div[class]')!);
      expect(screen.getByText('Edit metadata')).toBeInTheDocument();
    });

    it('opens the edit modal for the right-clicked album', () => {
      renderWithContext(<Albums />, { library });
      fireEvent.contextMenu(screen.getByText('First Album').closest('div[class]')!);
      fireEvent.click(screen.getByText('Edit metadata'));
      expect(screen.getByText(/Edit album — First Album/)).toBeInTheDocument();
    });

    it('pre-fills the artist from the album songs', () => {
      renderWithContext(<Albums />, { library });
      fireEvent.contextMenu(screen.getByText('First Album').closest('div[class]')!);
      fireEvent.click(screen.getByText('Edit metadata'));
      expect(screen.getByLabelText('Artist')).toHaveValue('Band A');
    });
  });
});
