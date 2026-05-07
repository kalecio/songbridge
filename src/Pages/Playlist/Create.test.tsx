import { useState } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { MetadataType, PlaylistType } from '../../types';
import { DEFAULT_SHORTCUTS } from '../../keyboard';
import CreatePlaylist from './Create';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }));
const mockInvoke = vi.mocked(invoke);

const Wrapper = ({
  initialPlaylists = [],
  library = [],
}: {
  initialPlaylists?: PlaylistType[];
  library?: MetadataType[];
}) => {
  const [playlists, setPlaylists] = useState<PlaylistType[]>(initialPlaylists);
  return (
    <MemoryRouter>
      <AppContext.Provider
        value={{
          onRepeat: false,
          onShuffle: false,
          isPlaying: false,
          isScanning: false,
          scanProgress: { current: 0, total: 0 },
          shortcuts: DEFAULT_SHORTCUTS,
          library,
          libraryPaths: [],
          progress: 0,
          currentPlaylist: [],
          currentTheme: 'Midnight',
          playlists,
          setPlaylists,
        }}
      >
        <CreatePlaylist />
      </AppContext.Provider>
    </MemoryRouter>
  );
};

const songA: MetadataType = { title: 'Song Alpha', artist: 'Artist A', path: '/music/a.mp3' };
const songB: MetadataType = { title: 'Song Beta', artist: 'Artist B', path: '/music/b.mp3' };

beforeEach(() => {
  mockInvoke.mockResolvedValue(undefined);
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234' as ReturnType<typeof crypto.randomUUID>);
});

afterEach(() => {
  vi.restoreAllMocks();
  mockInvoke.mockReset();
});

describe('CreatePlaylist', () => {
  describe('empty state', () => {
    it('shows "No playlists yet" when playlists is empty', () => {
      const { getByText } = render(<Wrapper />);
      expect(getByText('No playlists yet')).toBeInTheDocument();
    });

    it('shows "Select a playlist on the left or create a new one" when nothing is selected', () => {
      const { getByText } = render(<Wrapper />);
      expect(getByText('Select a playlist on the left or create a new one')).toBeInTheDocument();
    });
  });

  describe('creating a playlist', () => {
    it('adds a playlist to the sidebar and opens the editor when clicking "+ New Playlist"', () => {
      const { getByText, getByLabelText } = render(<Wrapper />);
      fireEvent.click(getByText('+ New Playlist'));
      expect(getByText('New Playlist')).toBeInTheDocument();
      expect(getByLabelText('Playlist name')).toHaveValue('New Playlist');
    });
  });

  describe('selecting a playlist', () => {
    it('selects a playlist and shows its name in the input when clicked', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'My Mix', songs: [] }];
      const { getByText, getByLabelText } = render(<Wrapper initialPlaylists={playlists} />);
      fireEvent.click(getByText('My Mix'));
      expect(getByLabelText('Playlist name')).toHaveValue('My Mix');
    });

    it('shows song count in sidebar item', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'My Mix', songs: [songA, songB] }];
      const { getByText } = render(<Wrapper initialPlaylists={playlists} />);
      expect(getByText('2 songs')).toBeInTheDocument();
    });
  });

  describe('renaming', () => {
    it('updates the playlist name in the sidebar on blur', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'Old Name', songs: [] }];
      const { getByLabelText, getByText } = render(<Wrapper initialPlaylists={playlists} />);
      fireEvent.click(getByText('Old Name'));
      const input = getByLabelText('Playlist name');
      fireEvent.change(input, { target: { value: 'New Name' } });
      fireEvent.blur(input);
      expect(getByText('New Name')).toBeInTheDocument();
    });

    it('updates the playlist name on Enter key', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'Old Name', songs: [] }];
      const { getByLabelText, getByText } = render(<Wrapper initialPlaylists={playlists} />);
      fireEvent.click(getByText('Old Name'));
      const input = getByLabelText('Playlist name');
      fireEvent.change(input, { target: { value: 'Renamed' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(getByText('Renamed')).toBeInTheDocument();
    });

    it('does not rename when the new name is empty', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'Keep Me', songs: [] }];
      const { getByLabelText, getByText } = render(<Wrapper initialPlaylists={playlists} />);
      fireEvent.click(getByText('Keep Me'));
      const input = getByLabelText('Playlist name');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);
      expect(getByText('Keep Me')).toBeInTheDocument();
    });

    it('does not rename when the new name is only whitespace', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'Keep Me', songs: [] }];
      const { getByLabelText, getByText } = render(<Wrapper initialPlaylists={playlists} />);
      fireEvent.click(getByText('Keep Me'));
      const input = getByLabelText('Playlist name');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.blur(input);
      expect(getByText('Keep Me')).toBeInTheDocument();
    });
  });

  describe('deleting a playlist', () => {
    it('calls invoke("db_delete_playlist") and removes the playlist from the list', async () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'To Delete', songs: [] }];
      const { getByLabelText, queryByText } = render(<Wrapper initialPlaylists={playlists} />);
      await act(async () => {
        fireEvent.click(getByLabelText('Delete To Delete'));
      });
      expect(mockInvoke).toHaveBeenCalledWith('db_delete_playlist', { id: 'p1' });
      expect(queryByText('To Delete')).not.toBeInTheDocument();
    });

    it('clears the editor when the selected playlist is deleted', async () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'Active', songs: [] }];
      const { getByLabelText, getByText, queryByLabelText } = render(<Wrapper initialPlaylists={playlists} />);
      fireEvent.click(getByText('Active'));
      expect(getByLabelText('Playlist name')).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(getByLabelText('Delete Active'));
      });
      expect(queryByLabelText('Playlist name')).not.toBeInTheDocument();
    });
  });

  describe('playlist song management', () => {
    it('shows "Add songs from your library →" for an empty selected playlist', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'Empty', songs: [] }];
      const { getByText } = render(<Wrapper initialPlaylists={playlists} />);
      fireEvent.click(getByText('Empty'));
      expect(getByText('Add songs from your library →')).toBeInTheDocument();
    });

    it('shows song titles in the "In playlist" column when the playlist has songs', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'Full', songs: [songA, songB] }];
      const { getByText } = render(<Wrapper initialPlaylists={playlists} />);
      fireEvent.click(getByText('Full'));
      expect(getByText('Song Alpha')).toBeInTheDocument();
      expect(getByText('Song Beta')).toBeInTheDocument();
    });

    it('removes a song from the playlist when the remove button is clicked', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'My Mix', songs: [songA, songB] }];
      const { getByText, getByLabelText, queryByText } = render(<Wrapper initialPlaylists={playlists} />);
      fireEvent.click(getByText('My Mix'));
      fireEvent.click(getByLabelText('Remove Song Alpha'));
      expect(queryByText('Song Alpha')).not.toBeInTheDocument();
      expect(getByText('Song Beta')).toBeInTheDocument();
    });

    it('adds a library song to the playlist when clicked', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'My List', songs: [] }];
      const { getByText, queryByText } = render(<Wrapper initialPlaylists={playlists} library={[songA]} />);
      fireEvent.click(getByText('My List'));
      fireEvent.click(getByText('Song Alpha'));
      expect(queryByText('Add songs from your library →')).not.toBeInTheDocument();
    });

    it('is a no-op when adding a duplicate song', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'My List', songs: [songA] }];
      const { getByText, getAllByText } = render(<Wrapper initialPlaylists={playlists} library={[songA, songB]} />);
      fireEvent.click(getByText('My List'));
      fireEvent.click(getByText('Song Beta'));
      expect(getAllByText('Song Alpha')).toHaveLength(1);
    });

    it('hides a song from the library column once it is added to the playlist', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'My List', songs: [] }];
      const { getByText, queryAllByText } = render(<Wrapper initialPlaylists={playlists} library={[songA, songB]} />);
      fireEvent.click(getByText('My List'));
      expect(queryAllByText('Song Alpha')).toHaveLength(1);
      fireEvent.click(getByText('Song Alpha'));
      expect(queryAllByText('Song Alpha')).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('filters library songs by title', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'My List', songs: [] }];
      const { getByText, getByPlaceholderText, queryByText } = render(
        <Wrapper initialPlaylists={playlists} library={[songA, songB]} />,
      );
      fireEvent.click(getByText('My List'));
      fireEvent.change(getByPlaceholderText('Search songs…'), { target: { value: 'Alpha' } });
      expect(getByText('Song Alpha')).toBeInTheDocument();
      expect(queryByText('Song Beta')).not.toBeInTheDocument();
    });

    it('filters library songs by artist', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'My List', songs: [] }];
      const { getByText, getByPlaceholderText, queryByText } = render(
        <Wrapper initialPlaylists={playlists} library={[songA, songB]} />,
      );
      fireEvent.click(getByText('My List'));
      fireEvent.change(getByPlaceholderText('Search songs…'), { target: { value: 'Artist B' } });
      expect(getByText('Song Beta')).toBeInTheDocument();
      expect(queryByText('Song Alpha')).not.toBeInTheDocument();
    });

    it('shows "No matches" when the search has no results', () => {
      const playlists: PlaylistType[] = [{ id: 'p1', name: 'My List', songs: [] }];
      const { getByText, getByPlaceholderText } = render(<Wrapper initialPlaylists={playlists} library={[songA]} />);
      fireEvent.click(getByText('My List'));
      fireEvent.change(getByPlaceholderText('Search songs…'), { target: { value: 'zzznomatch' } });
      expect(getByText('No matches')).toBeInTheDocument();
    });
  });
});
