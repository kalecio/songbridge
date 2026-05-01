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
  });
});
