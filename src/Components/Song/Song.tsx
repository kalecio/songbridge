import { AlbumImage, AlbumImagePlaceholder, ArtistName, MusicInfo, MusicName, SongContainer } from '../Song/styles';

interface SongProps {
    albumImage?: string;
    albumName?: string;
    artistName: string;
    songName: string;
}

const SongComponent = ({songName, artistName, albumImage, albumName = ""}: SongProps) => {
  return (
    <SongContainer>
        {albumImage ? <AlbumImage src={albumImage} alt={albumName} /> : <AlbumImagePlaceholder />}
        <MusicInfo>
            <MusicName>{songName}</MusicName>
            <ArtistName>{artistName}</ArtistName>
        </MusicInfo>
    </SongContainer>
  );
};

export default SongComponent;
