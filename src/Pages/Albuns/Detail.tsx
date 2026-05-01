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

const AlbumDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { library, currentPath, setCurrentPath, setCurrentPlaylist } = useContext(AppContext);

  const albumName = decodeURIComponent(id ?? '');
  const songs = library.filter((s) => (s.album ?? 'Unknown Album') === albumName);
  const heroImage = songs.find((s) => s.image)?.image;
  const artist = songs[0]?.artist;
  const year = songs[0]?.year;

  const playSong = (song: MetadataType) => {
    const paths = songs.map((s) => s.path).filter((p): p is string => Boolean(p));
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
            <PlaceholderInitial>{albumName.charAt(0).toUpperCase()}</PlaceholderInitial>
          </HeroPlaceholder>
        )}
        <HeroOverlay />
        <HeroTop>
          <BackButton onClick={() => navigate('/albums')}>Albums</BackButton>
        </HeroTop>
        <HeroBottom>
          <HeroTitle>{albumName}</HeroTitle>
          <HeroStats>
            {artist && <>{artist} · </>}
            {year && <>{year} · </>}
            {songs.length} {songs.length === 1 ? 'song' : 'songs'}
          </HeroStats>
        </HeroBottom>
      </Hero>

      <HeroContent>
        <Playlist
          songs={songs}
          name={albumName}
          type="Album"
          activePath={currentPath}
          onSongClick={playSong}
          onPlayAll={() => songs[0] && playSong(songs[0])}
        />
      </HeroContent>
    </HeroWrapper>
  );
};

export default AlbumDetail;
