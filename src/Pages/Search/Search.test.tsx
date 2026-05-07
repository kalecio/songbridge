import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppContext } from '../../Context/AppContext';
import { MetadataType, PlaylistType } from '../../types';
import { FAVOURITES_PLAYLIST_ID } from '../../hooks/useFavourites';
import { DEFAULT_SHORTCUTS } from '../../keyboard';
import Search from './Search';

type AppContextValue = React.ComponentProps<typeof AppContext.Provider>['value'];

const defaultContext: AppContextValue = {
  onRepeat: false,
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

const library: MetadataType[] = [
  { path: '/a.mp3', title: 'Neon Lights', artist: 'Synthwave Band', album: 'Future Nostalgia' },
  { path: '/b.mp3', title: 'Dark Matter', artist: 'Synthwave Band', album: 'Void EP' },
  { path: '/c.mp3', title: 'Echoes', artist: 'Post Rock Trio', album: 'Future Nostalgia' },
  { path: '/d.mp3', title: 'Organic Pulse', artist: 'Jazz Collective', album: 'Blue Hours' },
];

const renderSearch = (query: string, contextOverrides: Partial<AppContextValue> = {}) =>
  render(
    <MemoryRouter initialEntries={[`/search?q=${encodeURIComponent(query)}`]}>
      <AppContext.Provider value={{ ...defaultContext, library, ...contextOverrides }}>
        <Routes>
          <Route path="/search" element={<Search />} />
          <Route path="/artists/:id" element={<div>Artist page</div>} />
          <Route path="/albums/:id" element={<div>Album page</div>} />
          <Route path="/playlist/:id" element={<div>Playlist page</div>} />
        </Routes>
      </AppContext.Provider>
    </MemoryRouter>,
  );

describe('Search', () => {
  describe('empty state', () => {
    it('renders nothing when query is empty', () => {
      render(
        <MemoryRouter initialEntries={['/search?q=']}>
          <AppContext.Provider value={{ ...defaultContext, library }}>
            <Routes>
              <Route path="/search" element={<Search />} />
            </Routes>
          </AppContext.Provider>
        </MemoryRouter>,
      );
      expect(screen.queryByText(/results/i)).not.toBeInTheDocument();
    });

    it('shows a no-results message when nothing matches', () => {
      renderSearch('xyzzy');
      expect(screen.getByText(/No results for/i)).toBeInTheDocument();
    });
  });

  describe('song results', () => {
    it('shows songs whose title matches the query', () => {
      renderSearch('neon');
      expect(screen.getByText('Neon Lights')).toBeInTheDocument();
    });

    it('shows songs whose artist matches the query', () => {
      renderSearch('synthwave');
      expect(screen.getByText('Neon Lights')).toBeInTheDocument();
      expect(screen.getByText('Dark Matter')).toBeInTheDocument();
    });

    it('shows songs whose album matches the query', () => {
      renderSearch('future nostalgia');
      expect(screen.getByText('Neon Lights')).toBeInTheDocument();
      expect(screen.getByText('Echoes')).toBeInTheDocument();
    });

    it('is case-insensitive', () => {
      renderSearch('NEON');
      expect(screen.getByText('Neon Lights')).toBeInTheDocument();
    });

    it('calls setCurrentPath and setCurrentPlaylist when a song is clicked', () => {
      const setCurrentPath = vi.fn();
      const setCurrentPlaylist = vi.fn();
      renderSearch('neon', { setCurrentPath, setCurrentPlaylist });
      fireEvent.click(screen.getByText('Neon Lights'));
      expect(setCurrentPath).toHaveBeenCalledWith('/a.mp3');
      expect(setCurrentPlaylist).toHaveBeenCalled();
    });
  });

  describe('artist results', () => {
    const getArtistsSection = () => screen.getByText('Artists').parentElement!;

    it('shows an artist section when an artist name matches', () => {
      renderSearch('synthwave');
      expect(within(getArtistsSection()).getByText('Synthwave Band')).toBeInTheDocument();
    });

    it('does not show duplicate artists', () => {
      renderSearch('synthwave');
      expect(within(getArtistsSection()).getAllByText('Synthwave Band')).toHaveLength(1);
    });

    it('navigates to the artist page when an artist row is clicked', () => {
      renderSearch('synthwave');
      fireEvent.click(within(getArtistsSection()).getByText('Synthwave Band'));
      expect(screen.getByText('Artist page')).toBeInTheDocument();
    });
  });

  describe('album results', () => {
    it('shows an album section when an album name matches', () => {
      renderSearch('void');
      expect(screen.getByText('Void EP')).toBeInTheDocument();
    });

    it('does not show duplicate albums', () => {
      renderSearch('future nostalgia');
      expect(screen.getAllByText('Future Nostalgia')).toHaveLength(1);
    });

    it('navigates to the album page when an album row is clicked', () => {
      renderSearch('void');
      fireEvent.click(screen.getByText('Void EP'));
      expect(screen.getByText('Album page')).toBeInTheDocument();
    });
  });

  describe('result count', () => {
    it('shows the total number of matching songs', () => {
      renderSearch('synthwave');
      expect(screen.getByText(/2 results/i)).toBeInTheDocument();
    });

    it('uses singular "result" when only one song matches', () => {
      renderSearch('neon');
      expect(screen.getByText(/1 result/i)).toBeInTheDocument();
    });
  });

  describe('playlist results', () => {
    const playlists: PlaylistType[] = [
      { id: FAVOURITES_PLAYLIST_ID, name: 'Favourites', songs: [{ path: '/a.mp3', title: 'Neon Lights' }] },
      { id: 'p1', name: 'Late Night', songs: [{ path: '/c.mp3' }] },
      { id: 'p2', name: 'Morning Mix', songs: [] },
    ];

    const getPlaylistsSection = () => screen.getByText('Playlists').parentElement!;

    it('shows a playlist whose name matches the query', () => {
      renderSearch('late', { playlists });
      expect(within(getPlaylistsSection()).getByText('Late Night')).toBeInTheDocument();
    });

    it('does not match playlists by song title or artist (name only)', () => {
      renderSearch('neon', { playlists });
      expect(screen.queryByText('Playlists')).not.toBeInTheDocument();
    });

    it('renders results when only a playlist matches and no songs do', () => {
      renderSearch('favourites', { playlists });
      expect(within(getPlaylistsSection()).getByText('Favourites')).toBeInTheDocument();
      expect(screen.queryByText(/results for/i)).not.toBeInTheDocument();
    });

    it('navigates to the playlist when its row is clicked', () => {
      renderSearch('late', { playlists });
      fireEvent.click(within(getPlaylistsSection()).getByText('Late Night'));
      expect(screen.getByText('Playlist page')).toBeInTheDocument();
    });

    it('pins Favourites to the top of the playlist list', () => {
      const playlistsWithMatchingNames: PlaylistType[] = [
        { id: 'p1', name: 'Mood', songs: [] },
        { id: FAVOURITES_PLAYLIST_ID, name: 'Favourites Mood', songs: [] },
        { id: 'p2', name: 'Mood Booster', songs: [] },
      ];
      renderSearch('mood', { playlists: playlistsWithMatchingNames });
      const titles = within(getPlaylistsSection()).getAllByText(/Mood/);
      expect(titles[0].textContent).toBe('Favourites Mood');
    });
  });
});
