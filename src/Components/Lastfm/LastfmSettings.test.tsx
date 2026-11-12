import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import LastfmSettings from './LastfmSettings';
import type { LastfmStatus } from './LastfmProvider';

let status: LastfmStatus;
const refresh = vi.fn().mockResolvedValue(undefined);
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('./LastfmProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./LastfmProvider')>()),
  useLastfm: () => ({ status, refresh }),
}));
beforeEach(() => {
  status = {
    configured: true,
    connected: false,
    username: null,
    enabled: false,
    persistent: false,
    authorizing: false,
    error: null,
    current: null,
    pending: 0,
    history: [],
  };
  vi.mocked(invoke).mockReset();
  vi.mocked(openUrl).mockReset();
});

it('explains missing build credentials and prevents authorization', () => {
  status.configured = false;
  render(<LastfmSettings />);
  expect(screen.getByText(/Last.fm is unavailable in this build/)).toBeInTheDocument();
  expect(screen.getByText('Connect to Last.fm')).toBeDisabled();
});

it('opens browser authorization and allows explicit session-only completion', async () => {
  status.authorizing = true;
  vi.mocked(invoke).mockResolvedValue('https://www.last.fm/api/auth/?api_key=public&token=temporary');
  render(<LastfmSettings />);
  fireEvent.click(screen.getByText('Connect to Last.fm'));
  await waitFor(() =>
    expect(openUrl).toHaveBeenCalledWith('https://www.last.fm/api/auth/?api_key=public&token=temporary'),
  );
  await waitFor(() => expect(screen.getByText('Complete connection')).toBeEnabled());
  fireEvent.click(screen.getByLabelText('Remember this account securely'));
  fireEvent.click(screen.getByText('Complete connection'));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('lastfm_complete_connection', { remember: false }));
});

it('shows rejected outcomes and requires confirmation before removing queued plays', async () => {
  status.connected = true;
  status.username = 'listener';
  status.enabled = true;
  status.pending = 3;
  status.history = [
    {
      id: 'one',
      path: '/song.mp3',
      track: { title: 'Song', artist: 'Artist', album: 'Album' },
      listened: 31,
      required: 30,
      timestamp: 1000,
      status: 'track_rejected',
    },
  ];
  render(<LastfmSettings />);
  expect(screen.getByText('Last.fm rejected the track metadata.')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Disconnect'));
  expect(invoke).not.toHaveBeenCalled();
  expect(screen.getByText(/Disconnecting removes the saved credentials/)).toBeInTheDocument();
  fireEvent.click(screen.getAllByText('Disconnect')[1]);
  await waitFor(() => expect(invoke).toHaveBeenCalledWith('lastfm_disconnect'));
});
