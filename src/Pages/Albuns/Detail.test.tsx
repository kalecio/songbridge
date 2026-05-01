import { renderWithContext } from '../../test/helpers';
import AlbumDetail from './Detail';
import { MetadataType } from '../../types';

const library: MetadataType[] = [
  { title: 'Track 1', artist: 'Band A', album: 'Great Album', year: '2020', path: '/music/1.mp3' },
  { title: 'Track 2', artist: 'Band A', album: 'Great Album', year: '2020', path: '/music/2.mp3' },
  { title: 'Other Track', artist: 'Band B', album: 'Other Album', path: '/music/3.mp3' },
];

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'Great%20Album' }),
  };
});

describe('AlbumDetail', () => {
  it('renders the album name in the hero', () => {
    const { getAllByText } = renderWithContext(<AlbumDetail />, { library });
    expect(getAllByText('Great Album').length).toBeGreaterThan(0);
  });

  it('shows the artist name in the stats', () => {
    const { getAllByText } = renderWithContext(<AlbumDetail />, { library });
    expect(getAllByText(/Band A/).length).toBeGreaterThan(0);
  });

  it('shows the release year in the stats', () => {
    const { getByText } = renderWithContext(<AlbumDetail />, { library });
    expect(getByText(/2020/)).toBeInTheDocument();
  });

  it('shows the song count', () => {
    const { getAllByText } = renderWithContext(<AlbumDetail />, { library });
    expect(getAllByText(/2 songs/).length).toBeGreaterThan(0);
  });

  it('only shows songs from the current album', () => {
    const { queryByText } = renderWithContext(<AlbumDetail />, { library });
    expect(queryByText('Other Track')).not.toBeInTheDocument();
  });

  it('renders a back button to the albums list', () => {
    const { getByText } = renderWithContext(<AlbumDetail />, { library });
    expect(getByText('Albums')).toBeInTheDocument();
  });
});
