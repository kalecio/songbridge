import { useContext } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import BackButton from '../../Components/BackButton/BackButton';
import HeroTitle from '../../Components/HeroTitle/HeroTitle';
import {
  HeroWrapper,
  Hero,
  HeroBg,
  HeroPlaceholder,
  PlaceholderInitial,
  HeroOverlay,
  HeroTop,
  HeroBottom,
  HeroStats,
  HeroContent,
} from '../../Components/HeroSection/HeroSection';
import Playlist from '../../Components/Playlist/Playlist';

interface AlbumGroup {
  name: string;
  songs: MetadataType[];
}

function groupByAlbum(songs: MetadataType[]): AlbumGroup[] {
  const map = new Map<string, AlbumGroup>();
  for (const song of songs) {
    const key = song.album ?? 'Unknown Album';
    if (!map.has(key)) map.set(key, { name: key, songs: [] });
    map.get(key)!.songs.push(song);
  }
  return Array.from(map.values()).sort((a, b) => {
    const yearA = a.songs[0]?.year ?? '';
    const yearB = b.songs[0]?.year ?? '';
    return yearA.localeCompare(yearB);
  });
}

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { library, currentPath, setCurrentPath, setCurrentPlaylist } = useContext(AppContext);

  const artistName = decodeURIComponent(id ?? '');
  const artistSongs = library.filter((s) => (s.artist ?? 'Unknown Artist') === artistName);
  const albums = groupByAlbum(artistSongs);
  const heroImage = artistSongs.find((s) => s.image)?.image;

  const playSong = (song: MetadataType, albumSongs: MetadataType[]) => {
    const paths = albumSongs.map((s) => s.path).filter((p): p is string => Boolean(p));
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(song.path);
  };

  return (
    <HeroWrapper>
      <Hero>
        {heroImage ? (
          <HeroBg src={heroImage} />
        ) : (
          <HeroPlaceholder>
            <PlaceholderInitial>{artistName.charAt(0).toUpperCase()}</PlaceholderInitial>
          </HeroPlaceholder>
        )}
        <HeroOverlay />
        <HeroTop>
          <BackButton onClick={() => navigate('/artists')}>Artists</BackButton>
        </HeroTop>
        <HeroBottom>
          <HeroTitle>{artistName}</HeroTitle>
          <HeroStats>
            {albums.length} {albums.length === 1 ? 'album' : 'albums'} · {artistSongs.length}{' '}
            {artistSongs.length === 1 ? 'song' : 'songs'}
          </HeroStats>
        </HeroBottom>
      </Hero>

      <HeroContent>
        {albums.map((album) => (
          <Playlist
            key={album.name}
            songs={album.songs}
            name={album.name}
            type="Album"
            activePath={currentPath}
            onSongClick={(song) => playSong(song, album.songs)}
            onPlayAll={() => album.songs[0] && playSong(album.songs[0], album.songs)}
          />
        ))}
      </HeroContent>
    </HeroWrapper>
  );
};

export default ArtistDetail;
