import { fireEvent, screen } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { renderWithContext } from '../../test/helpers';
import Lyrics from './Lyrics';
import LyricsFontControl from '../../Components/LyricsFontControl/LyricsFontControl';
import Settings from '../Settings/Settings';
import { LYRICS_FONT_SIZE_KEY } from '../../hooks/useLyricsFontSize';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(null) }));
const mockInvoke = vi.mocked(invoke);
beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
beforeEach(() => {
  localStorage.removeItem(LYRICS_FONT_SIZE_KEY);
  mockInvoke.mockReset();
});
afterEach(() => {
  localStorage.removeItem(LYRICS_FONT_SIZE_KEY);
  vi.restoreAllMocks();
});

it.each([
  ['plain', 'First line\nSecond line'],
  ['synced', '[00:00.00]First line\n[00:05.00]Second line'],
])('changes the font size for %s lyrics and restores it when reopening the page', async (_type, content) => {
  mockInvoke.mockResolvedValue(content);
  const context = { currentPath: '/music/test.mp3', metadata: { duration: { duration_seconds: 60 } } };
  const settings = renderWithContext(<Settings />);
  fireEvent.change(screen.getByRole('slider', { name: 'Lyrics font size' }), { target: { value: '24' } });
  settings.unmount();
  const first = renderWithContext(<Lyrics />, context);
  const line = await screen.findByText('First line');
  expect(screen.queryByRole('slider', { name: 'Lyrics font size' })).not.toBeInTheDocument();
  expect(line.parentElement).toHaveStyle({ fontSize: '24px' });
  expect(localStorage.getItem(LYRICS_FONT_SIZE_KEY)).toBe('24');
  first.unmount();
  renderWithContext(<Lyrics />, context);
  expect((await screen.findByText('First line')).parentElement).toHaveStyle({ fontSize: '24px' });
});
it('applies settings to lyrics without showing controls on the lyrics page', async () => {
  const settings = renderWithContext(<Settings />);
  fireEvent.change(screen.getByRole('slider', { name: 'Lyrics font size' }), { target: { value: '56' } });
  expect(screen.getByText('Find your rhythm.')).toHaveStyle({ fontSize: '56px' });
  settings.unmount();
  mockInvoke.mockResolvedValue('First line');
  const lyrics = renderWithContext(<Lyrics />, { currentPath: '/music/test.mp3' });
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  expect((await screen.findByText('First line')).parentElement).toHaveStyle({ fontSize: '56px' });
  lyrics.unmount();
  renderWithContext(<Settings />);
  fireEvent.click(screen.getByRole('button', { name: 'Reset lyrics font size' }));
  expect(screen.getByRole('slider')).toHaveValue('38');
});
it.each([
  ['garbage', '38'],
  ['1000', '72'],
  ['-10', '16'],
])('validates stored font size %s', (saved, expected) => {
  localStorage.setItem(LYRICS_FONT_SIZE_KEY, saved);
  renderWithContext(<LyricsFontControl />);
  expect(screen.getByRole('slider')).toHaveValue(expected);
});
it('updates all mounted controls immediately', () => {
  renderWithContext(
    <>
      <LyricsFontControl />
      <LyricsFontControl />
    </>,
  );
  const controls = screen.getAllByRole('slider');
  fireEvent.change(controls[0], { target: { value: '64' } });
  expect(controls[1]).toHaveValue('64');
});
it('keeps font changes usable when preferences cannot be saved', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota exceeded');
  });
  renderWithContext(<LyricsFontControl />);
  fireEvent.change(screen.getByRole('slider'), { target: { value: '48' } });
  expect(screen.getByRole('slider')).toHaveValue('48');
  vi.restoreAllMocks();
  fireEvent.click(screen.getByRole('button', { name: 'Reset lyrics font size' }));
});

it('opens LRCLIB search from missing lyrics and displays the downloaded lyrics without switching songs', async () => {
  let content: string | null = null;
  const song = { path: '/music/test.mp3', title: 'Test track', artist: 'Test artist', album: 'Test album' };
  mockInvoke.mockImplementation(async (command) => {
    if (command === 'read_lrc_file') return content;
    if (command === 'search_lrclib_lyrics')
      return [
        {
          id: 42,
          trackName: song.title,
          artistName: song.artist,
          instrumental: false,
          syncedLyrics: '[00:00]Downloaded lyrics',
        },
      ];
    if (command === 'download_lrclib_lyrics') {
      content = '[00:00]Downloaded lyrics';
      return;
    }
    return null;
  });
  renderWithContext(<Lyrics />, { currentPath: song.path, metadata: song });
  fireEvent.click(await screen.findByRole('button', { name: 'Find lyrics' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Track, artist, album…')).toHaveValue('Test track Test artist');
  fireEvent.click(await screen.findByRole('button', { name: 'Synced' }));
  expect(await screen.findByText('Downloaded lyrics')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Find lyrics' })).not.toBeInTheDocument();
  expect(mockInvoke).toHaveBeenCalledWith(
    'download_lrclib_lyrics',
    expect.objectContaining({ songPath: song.path, trackId: 42 }),
  );
});
it('offers lyric search when a local lyrics file is empty', async () => {
  mockInvoke.mockResolvedValue('  \n');
  renderWithContext(<Lyrics />, { currentPath: '/music/test.mp3' });
  expect(await screen.findByRole('button', { name: 'Find lyrics' })).toBeInTheDocument();
});
it('does not offer a download without a current song', async () => {
  renderWithContext(<Lyrics />);
  expect(screen.getByText('No song playing')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Find lyrics' })).not.toBeInTheDocument();
});
