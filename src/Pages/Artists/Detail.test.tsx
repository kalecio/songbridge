import { renderWithContext } from '../../test/helpers';
import ArtistDetail from './Detail';
import { MetadataType } from '../../types';

const library: MetadataType[] = [
  { title: 'Song 1', artist: 'Radiohead', album: 'OK Computer', path: '/music/1.mp3' },
  { title: 'Song 2', artist: 'Radiohead', album: 'OK Computer', path: '/music/2.mp3' },
  { title: 'Song 3', artist: 'Radiohead', album: 'Kid A', path: '/music/3.mp3' },
  { title: 'Other Song', artist: 'Blur', album: 'Parklife', path: '/music/4.mp3' },
];

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'Radiohead' }),
  };
});

describe('ArtistDetail', () => {
  it('renders the artist name in the hero', () => {
    const { getAllByText } = renderWithContext(<ArtistDetail />, { library });
    expect(getAllByText('Radiohead').length).toBeGreaterThan(0);
  });

  it('shows the album count', () => {
    const { getByText } = renderWithContext(<ArtistDetail />, { library });
    expect(getByText(/2 albums/)).toBeInTheDocument();
  });

  it('shows the song count', () => {
    const { getAllByText } = renderWithContext(<ArtistDetail />, { library });
    expect(getAllByText(/3 songs/).length).toBeGreaterThan(0);
  });

  it('renders a playlist section for each album', () => {
    const { getByText } = renderWithContext(<ArtistDetail />, { library });
    expect(getByText('OK Computer')).toBeInTheDocument();
    expect(getByText('Kid A')).toBeInTheDocument();
  });

  it('only shows songs for the current artist', () => {
    const { queryByText } = renderWithContext(<ArtistDetail />, { library });
    expect(queryByText('Other Song')).not.toBeInTheDocument();
  });

  it('renders a back button to the artists list', () => {
    const { getByText } = renderWithContext(<ArtistDetail />, { library });
    expect(getByText('Artists')).toBeInTheDocument();
  });
});
