import { useNavigate } from 'react-router';
import { AlbumImage, AlbumImagePlaceholder, ArtistName, MusicInfo, MusicName, SongContainer } from '../Song/styles';

interface SongProps {
  albumImage?: string;
  albumName?: string;
  artistName: string;
  songName: string;
}

const SongComponent = ({ songName, artistName, albumImage, albumName = '' }: SongProps) => {
  const navigate = useNavigate();
  // Don't link the placeholder text shown when no track is loaded.
  const linkable = artistName !== 'no name' && artistName.trim().length > 0;
  const goToArtist = () => navigate(`/artists/${encodeURIComponent(artistName)}`);

  return (
    <SongContainer>
      {albumImage ? <AlbumImage src={albumImage} alt={albumName} /> : <AlbumImagePlaceholder />}
      <MusicInfo>
        <MusicName title={songName}>{songName}</MusicName>
        <ArtistName
          title={artistName}
          $clickable={linkable}
          role={linkable ? 'link' : undefined}
          tabIndex={linkable ? 0 : undefined}
          onClick={linkable ? goToArtist : undefined}
          onKeyDown={
            linkable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goToArtist();
                  }
                }
              : undefined
          }
        >
          {artistName}
        </ArtistName>
      </MusicInfo>
    </SongContainer>
  );
};

export default SongComponent;
