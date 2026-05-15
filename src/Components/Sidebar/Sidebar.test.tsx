import { fireEvent, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import Sidebar from './Sidebar';
import { renderWithContext } from '../../test/helpers';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const mockInvoke = vi.mocked(invoke);

describe('Sidebar', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue({ title: 'Mock Song', artist: 'Mock Artist' });
  });

  describe('navigation menu', () => {
    it('renders all menu items when not showing queue', () => {
      const { getByText } = renderWithContext(<Sidebar />, { showQueue: false });
      expect(getByText('Home')).toBeInTheDocument();
      expect(getByText('Artists')).toBeInTheDocument();
      expect(getByText('Albums')).toBeInTheDocument();
      expect(getByText('Songs')).toBeInTheDocument();
    });

    it('hides the navigation menu when the queue is open', () => {
      const { queryByText } = renderWithContext(<Sidebar />, { showQueue: true });
      expect(queryByText('Home')).not.toBeInTheDocument();
    });

    it('renders playlist names from context', () => {
      const playlists = [
        { id: '1', name: 'Late Night Chill', songs: [] },
        { id: '2', name: 'Workout Mix', songs: [] },
      ];
      const { getByText } = renderWithContext(<Sidebar />, { playlists });
      expect(getByText('Late Night Chill')).toBeInTheDocument();
      expect(getByText('Workout Mix')).toBeInTheDocument();
    });

    it('does not show "Playing now" when the playlist is empty', () => {
      const { queryByText } = renderWithContext(<Sidebar />, { currentPlaylist: [] });
      expect(queryByText('Playing now')).not.toBeInTheDocument();
    });

    it('renders an img thumbnail for a playlist when the first song is in the library with an image', () => {
      const playlists = [{ id: '1', name: 'Chill', songs: [{ path: '/a.mp3', title: 'Track A' }] }];
      const library = [{ path: '/a.mp3', title: 'Track A', image: 'data:image/jpeg;base64,abc' }];
      const { getAllByRole, queryByTestId } = renderWithContext(<Sidebar />, { playlists, library });
      expect(queryByTestId('album-placeholder-container')).not.toBeInTheDocument();
      const imgs = getAllByRole('img') as HTMLImageElement[];
      expect(imgs.some((img) => img.src.includes('data:image/jpeg;base64,abc'))).toBe(true);
    });
  });

  describe('queue view', () => {
    it('shows fetched song titles when showQueue is true', async () => {
      const { getByText } = renderWithContext(<Sidebar />, {
        showQueue: true,
        currentPlaylist: ['song1.mp3'],
      });
      await waitFor(() => expect(getByText('Mock Song')).toBeInTheDocument());
    });

    it('fetches metadata for each path in the playlist', async () => {
      renderWithContext(<Sidebar />, {
        showQueue: true,
        currentPlaylist: ['a.mp3', 'b.mp3'],
      });
      await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('get_metadata', { path: 'a.mp3' }));
      expect(mockInvoke).toHaveBeenCalledWith('get_metadata', { path: 'b.mp3' });
    });

    it('calls setCurrentPath when a queue item is clicked', async () => {
      const setCurrentPath = vi.fn();
      const { getByText } = renderWithContext(<Sidebar />, {
        showQueue: true,
        currentPlaylist: ['song1.mp3'],
        setCurrentPath,
      });
      await waitFor(() => getByText('Mock Song'));
      fireEvent.click(getByText('Mock Song'));
      expect(setCurrentPath).toHaveBeenCalledWith('song1.mp3');
    });

    it('calls setShowQueue(false) when the close-queue button is clicked', () => {
      const setShowQueue = vi.fn();
      const { getByLabelText } = renderWithContext(<Sidebar />, {
        showQueue: true,
        setShowQueue,
      });
      fireEvent.click(getByLabelText('close queue'));
      expect(setShowQueue).toHaveBeenCalledWith(false);
    });

    describe('drag to reorder', () => {
      const queueRows = (container: HTMLElement) =>
        Array.from(container.querySelectorAll<HTMLElement>('[draggable="true"]'));

      it('makes each queue row draggable', async () => {
        const { container, getAllByText } = renderWithContext(<Sidebar />, {
          showQueue: true,
          currentPlaylist: ['/a.mp3', '/b.mp3'],
        });
        await waitFor(() => getAllByText('Mock Song'));
        expect(queueRows(container).length).toBe(2);
      });

      it('reorders the queue on drop', async () => {
        const setCurrentPlaylist = vi.fn();
        const { container, getAllByText } = renderWithContext(<Sidebar />, {
          showQueue: true,
          currentPlaylist: ['/a.mp3', '/b.mp3', '/c.mp3'],
          setCurrentPlaylist,
        });
        await waitFor(() => getAllByText('Mock Song'));
        const rows = queueRows(container);
        expect(rows.length).toBe(3);
        fireEvent.dragStart(rows[0]);
        fireEvent.dragOver(rows[2]);
        fireEvent.drop(rows[2]);
        expect(setCurrentPlaylist).toHaveBeenCalledWith(['/b.mp3', '/c.mp3', '/a.mp3']);
      });

      it('does not reorder when dropping on the same row', async () => {
        const setCurrentPlaylist = vi.fn();
        const { container, getAllByText } = renderWithContext(<Sidebar />, {
          showQueue: true,
          currentPlaylist: ['/a.mp3', '/b.mp3'],
          setCurrentPlaylist,
        });
        await waitFor(() => getAllByText('Mock Song'));
        const rows = queueRows(container);
        fireEvent.dragStart(rows[0]);
        fireEvent.dragOver(rows[0]);
        fireEvent.drop(rows[0]);
        expect(setCurrentPlaylist).not.toHaveBeenCalled();
      });
    });
  });
});
