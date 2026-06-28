import { fireEvent, render, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppContext } from '../../Context/AppContext';
import { PlaylistType } from '../../types';
import { DEFAULT_SHORTCUTS } from '../../keyboard';
import Detail from './Detail';
import { LyricsSearchModalProvider } from '../../Context/LyricsSearchModalContext';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

const mockInvoke = vi.mocked(invoke);

type AppContextValue = React.ComponentProps<typeof AppContext.Provider>['value'];

const defaultContext: AppContextValue = {
  onRepeat: 'none',
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

const renderDetail = (playlists: PlaylistType[], contextOverrides: Partial<AppContextValue> = {}, playlistId = '1') => {
  return render(
    <MemoryRouter initialEntries={[`/playlist/${playlistId}`]}>
      <LyricsSearchModalProvider>
        <AppContext.Provider value={{ ...defaultContext, ...contextOverrides }}>
          <Routes>
            <Route path="/playlist/:id" element={<Detail playlists={playlists} />} />
          </Routes>
        </AppContext.Provider>
      </LyricsSearchModalProvider>
    </MemoryRouter>,
  );
};

describe('Detail', () => {
  it('renders the playlist name', () => {
    const playlists: PlaylistType[] = [{ id: '1', name: 'My Favorites', songs: [] }];
    const { getByText } = renderDetail(playlists);
    expect(getByText('My Favorites')).toBeInTheDocument();
  });

  it('renders song titles from stored data when there is no library match', () => {
    const playlists: PlaylistType[] = [
      {
        id: '1',
        name: 'Test',
        songs: [{ path: '/a.mp3', title: 'Stored Title', artist: 'Stored Artist' }],
      },
    ];
    const { getByText } = renderDetail(playlists);
    expect(getByText('Stored Title')).toBeInTheDocument();
    expect(getByText('Stored Artist')).toBeInTheDocument();
  });

  it('merges library data when a song is found in the library', () => {
    const playlists: PlaylistType[] = [
      {
        id: '1',
        name: 'Test',
        songs: [{ path: '/a.mp3', title: 'Song A' }],
      },
    ];
    const library = [{ path: '/a.mp3', title: 'Song A', image: 'data:image/jpeg;base64,abc' }];
    const { getAllByRole, queryAllByTestId } = renderDetail(playlists, { library });
    expect(getAllByRole('img').length).toBeGreaterThan(0);
    expect(queryAllByTestId('album-placeholder-container').length).toBeLessThan(
      queryAllByTestId('album-placeholder-container').length + 1,
    );
    const imgs = getAllByRole('img') as HTMLImageElement[];
    expect(imgs.some((img) => img.src.includes('data:image/jpeg;base64,abc'))).toBe(true);
  });

  it('persisted title takes precedence over library title', () => {
    const playlists: PlaylistType[] = [
      {
        id: '1',
        name: 'Test',
        songs: [{ path: '/a.mp3', title: 'Stored', artist: 'Artist' }],
      },
    ];
    const library = [{ path: '/a.mp3', title: 'Library', artist: 'Artist' }];
    const { getByText, queryByText } = renderDetail(playlists, { library });
    expect(getByText('Stored')).toBeInTheDocument();
    expect(queryByText('Library')).not.toBeInTheDocument();
  });

  it('renders stored title and artist when song is not in library', () => {
    const playlists: PlaylistType[] = [
      {
        id: '1',
        name: 'Test',
        songs: [{ path: '/b.mp3', title: 'No Match Title', artist: 'No Match Artist' }],
      },
    ];
    const library = [{ path: '/other.mp3', title: 'Other', artist: 'Other Artist' }];
    const { getByText } = renderDetail(playlists, { library });
    expect(getByText('No Match Title')).toBeInTheDocument();
    expect(getByText('No Match Artist')).toBeInTheDocument();
  });

  it('clicking a song calls setCurrentPath with the song path and setCurrentPlaylist with all paths', () => {
    const setCurrentPath = vi.fn();
    const setCurrentPlaylist = vi.fn();
    const playlists: PlaylistType[] = [
      {
        id: '1',
        name: 'Test',
        songs: [
          { path: '/a.mp3', title: 'Song A' },
          { path: '/b.mp3', title: 'Song B' },
        ],
      },
    ];
    const { getByText } = renderDetail(playlists, { setCurrentPath, setCurrentPlaylist });
    fireEvent.click(getByText('Song B'));
    expect(setCurrentPlaylist).toHaveBeenCalledWith(['/a.mp3', '/b.mp3']);
    expect(setCurrentPath).toHaveBeenCalledWith('/b.mp3');
  });

  it('clicking Play Now plays from the first song', () => {
    const setCurrentPath = vi.fn();
    const setCurrentPlaylist = vi.fn();
    const playlists: PlaylistType[] = [
      {
        id: '1',
        name: 'Test',
        songs: [
          { path: '/a.mp3', title: 'First Song' },
          { path: '/b.mp3', title: 'Second Song' },
        ],
      },
    ];
    const { getByText } = renderDetail(playlists, { setCurrentPath, setCurrentPlaylist });
    fireEvent.click(getByText('Play Now'));
    expect(setCurrentPath).toHaveBeenCalledWith('/a.mp3');
    expect(setCurrentPlaylist).toHaveBeenCalledWith(['/a.mp3', '/b.mp3']);
  });

  it('renders empty string as name when playlist id is not found', () => {
    const playlists: PlaylistType[] = [{ id: '99', name: 'Other Playlist', songs: [] }];
    const { queryByText } = renderDetail(playlists, {}, '1');
    expect(queryByText('Other Playlist')).not.toBeInTheDocument();
  });

  describe('remove missing tracks', () => {
    it('removes a missing song from the playlist and calls setPlaylists', async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'check_paths_exist') return Promise.resolve(['/a.mp3']);
        return Promise.resolve([]);
      });

      const setPlaylists = vi.fn();
      const playlists: PlaylistType[] = [
        {
          id: '1',
          name: 'Test',
          songs: [
            { path: '/a.mp3', title: 'Missing Song' },
            { path: '/b.mp3', title: 'Present Song' },
          ],
        },
      ];

      const { getByLabelText } = renderDetail(playlists, { setPlaylists });
      await waitFor(() => expect(getByLabelText('Remove missing track Missing Song')).toBeInTheDocument());
      fireEvent.click(getByLabelText('Remove missing track Missing Song'));

      expect(setPlaylists).toHaveBeenCalled();
      const updater = setPlaylists.mock.calls[0][0];
      const result = updater(playlists);
      expect(result[0].songs).toHaveLength(1);
      expect(result[0].songs[0].path).toBe('/b.mp3');
    });

    it('persists the updated playlist to the database after removing a missing song', async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'check_paths_exist') return Promise.resolve(['/a.mp3']);
        return Promise.resolve([]);
      });

      const playlists: PlaylistType[] = [
        {
          id: '1',
          name: 'Test',
          songs: [
            { path: '/a.mp3', title: 'Missing Song' },
            { path: '/b.mp3', title: 'Present Song' },
          ],
        },
      ];

      const { getByLabelText } = renderDetail(playlists, { setPlaylists: vi.fn() });
      await waitFor(() => expect(getByLabelText('Remove missing track Missing Song')).toBeInTheDocument());
      fireEvent.click(getByLabelText('Remove missing track Missing Song'));

      await waitFor(() =>
        expect(mockInvoke).toHaveBeenCalledWith(
          'db_upsert_playlist',
          expect.objectContaining({
            id: '1',
            songs: expect.arrayContaining([expect.objectContaining({ path: '/b.mp3' })]),
          }),
        ),
      );
    });
  });
});
