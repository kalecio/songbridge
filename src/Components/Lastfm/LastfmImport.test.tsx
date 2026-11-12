import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import LastfmImport from './LastfmImport';

const batchUpdate = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('../../hooks/useMetadataActions', () => ({
  useMetadataActions: () => ({ batchUpdateSongsMetadata: batchUpdate }),
}));

beforeEach(() => {
  vi.mocked(invoke).mockReset();
  batchUpdate.mockReset();
});

it('previews a match, preserves compilation artists and reports individual write failures', async () => {
  const songs = [
    { path: '/one.mp3', title: 'One', artist: 'Guest one', album: 'Old', track: 1 },
    { path: '/two.mp3', title: 'Two', artist: 'Guest two', album: 'Old', track: 2 },
  ];
  vi.mocked(invoke).mockImplementation(async (command, args) => {
    if (command === 'lastfm_search')
      return [{ name: 'New album', artist: 'Various Artists', url: 'https://www.last.fm/' }];
    if (command === 'lastfm_details')
      return { album: 'New album', artist: 'Various Artists', artwork: null, url: 'https://www.last.fm/' };
    if (command === 'get_metadata') return songs.find((s) => s.path === (args as { path: string }).path);
    throw new Error('Unexpected call ' + command);
  });
  batchUpdate.mockResolvedValue([{ path: '/one.mp3' }, { path: '/two.mp3', error: 'Read only' }]);
  render(<LastfmImport songs={songs} kind="album" onBack={vi.fn()} onClose={vi.fn()} onBusy={vi.fn()} />);
  fireEvent.click(screen.getByText('Search Last.fm'));
  fireEvent.click(await screen.findByText('New album · Various Artists'));
  await screen.findByText(/Suggested: New album/);
  expect(batchUpdate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Fill missing fields only'));
  fireEvent.click(screen.getByText('Apply selected fields to files'));
  await waitFor(() =>
    expect(batchUpdate).toHaveBeenCalledWith(
      ['/one.mp3', '/two.mp3'],
      {},
      {
        perTrack: {
          '/one.mp3': { album: 'New album', updateFields: ['album'] },
          '/two.mp3': { album: 'New album', updateFields: ['album'] },
        },
        reportFailures: true,
      },
    ),
  );
  expect(await screen.findByText('Updated')).toBeInTheDocument();
  expect(screen.getByText('Could not update: Read only')).toBeInTheDocument();
  expect(screen.queryByText('Apply selected fields to files')).not.toBeInTheDocument();
});

it('uses the actual embedded cover when filling missing fields', async () => {
  vi.mocked(invoke).mockImplementation(async (command) => {
    if (command === 'lastfm_search') return [{ name: 'Song', artist: 'Artist' }];
    if (command === 'lastfm_details')
      return {
        title: 'Song',
        artist: 'Artist',
        artwork: 'https://lastfm.freetls.fastly.net/a.jpg',
        url: 'https://www.last.fm/',
      };
    if (command === 'lastfm_artwork') return { path: '/cover.jpg', preview: 'data:image/jpeg;base64,AA==' };
    if (command === 'get_metadata') return { title: 'Song', artist: 'Artist', image: 'embedded-cover' };
  });
  batchUpdate.mockResolvedValue([]);
  render(
    <LastfmImport
      songs={[{ path: '/one.mp3', title: 'Song', artist: 'Artist' }]}
      kind="track"
      onBack={vi.fn()}
      onClose={vi.fn()}
      onBusy={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByText('Search Last.fm'));
  fireEvent.click(await screen.findByText('Song · Artist'));
  await screen.findByAltText('Cover art');
  await waitFor(() => expect(screen.getByText('Apply selected fields to files')).toBeEnabled());
  fireEvent.click(screen.getByText('Apply selected fields to files'));
  expect(await screen.findByText('No selected fields needed updating')).toBeInTheDocument();
  expect(batchUpdate).toHaveBeenCalledWith([], {}, { perTrack: {}, reportFailures: true });
});
