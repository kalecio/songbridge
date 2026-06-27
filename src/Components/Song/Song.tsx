import { useNavigate } from 'react-router';
import { AlbumImage, AlbumImagePlaceholder, ArtistName, MusicInfo, MusicName, SongContainer } from '../Song/styles';
import { CSSProperties } from 'react';

interface SongProps {
  albumImage?: string | null;
  albumName?: string | null;
  artistName: string;
  songName: string;
  style?: CSSProperties;
}

const SongComponent = ({ songName, artistName, albumImage, albumName, style }: SongProps) => {
  const navigate = useNavigate();
  // Tauri may deserialize a missing album as `null`, which the `?? ''` covers
  // (a destructure default only fires for `undefined`).
  const safeArtist = artistName ?? '';
  const safeAlbum = albumName ?? '';
  // Don't link the placeholder text shown when no track is loaded.
  const linkable = safeArtist !== 'no name' && safeArtist.trim().length > 0;
  const goToArtist = () => navigate(`/artists/${encodeURIComponent(safeArtist)}`);

  const albumLinkable = linkable && safeAlbum.trim().length > 0;
  const goToAlbum = () => navigate(`/albums/${encodeURIComponent(safeAlbum)}`);
  const albumLinkProps = albumLinkable
    ? {
        $clickable: true,
        role: 'link' as const,
        tabIndex: 0,
        'aria-label': `Open album ${safeAlbum}`,
        onClick: goToAlbum,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToAlbum();
          }
        },
      }
    : {};

  return (
    <SongContainer style={style}>
      {albumImage ? (
        <AlbumImage src={albumImage} alt={safeAlbum} {...albumLinkProps} />
      ) : (
        <AlbumImagePlaceholder {...albumLinkProps} />
      )}
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
