import { renderWithContext } from '../../test/helpers';
import Songs from './List';
import { MetadataType } from '../../types';

const library: MetadataType[] = [
  { title: 'Track One', artist: 'Artist A', path: '/music/one.mp3' },
  { title: 'Track Two', artist: 'Artist B', path: '/music/two.mp3' },
];

describe('Songs', () => {
  it('shows a scanning message while the library is loading', () => {
    const { getByText } = renderWithContext(<Songs />, { isScanning: true });
    expect(getByText(/scanning music library/i)).toBeInTheDocument();
  });

  it('shows an empty state message when the library has no songs', () => {
    const { getByText } = renderWithContext(<Songs />, { library: [] });
    expect(getByText(/no songs found/i)).toBeInTheDocument();
  });

  it('renders all song titles from the library', () => {
    const { getByText } = renderWithContext(<Songs />, { library });
    expect(getByText('Track One')).toBeInTheDocument();
    expect(getByText('Track Two')).toBeInTheDocument();
  });

  it('calls setCurrentPlaylist and setCurrentPath when a song is clicked', () => {
    const setCurrentPath = vi.fn();
    const setCurrentPlaylist = vi.fn();
    const { getByText } = renderWithContext(<Songs />, {
      library,
      setCurrentPath,
      setCurrentPlaylist,
    });
    getByText('Track One')
      .closest('div[class]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(setCurrentPlaylist).toHaveBeenCalledWith(['/music/one.mp3', '/music/two.mp3']);
    expect(setCurrentPath).toHaveBeenCalledWith('/music/one.mp3');
  });
});
