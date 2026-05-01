import { MetadataType } from '../../types';
import AlbumImage from '../AlbumImage/AlbumImage';
import {
  PlaylistContainer,
  Header,
  PlaylistInfo,
  PlaylistDetails,
  PlayNowButton,
  Type,
  PlaylistName,
  SongsQuantity,
  Play,
  SongList,
  SongItem,
  SongInfo,
  SongTitle,
  SongArtist,
  SongDuration,
} from './styles';

interface Props {
  songs: MetadataType[];
  name: string;
  type?: string;
  activePath?: string;
  onSongClick?: (_song: MetadataType) => void;
  onPlayAll?: () => void;
}

const Playlist = ({ songs, name, type = 'Playlist', activePath, onSongClick, onPlayAll }: Props) => {
  return (
    <PlaylistContainer>
      <Header>
        <PlaylistInfo>
          {type !== 'Library' && <AlbumImage metadata={songs[0]} height="10rem" width="10rem" />}
          <PlaylistDetails>
            <Type>{type}</Type>
            <PlaylistName>{name}</PlaylistName>
            <SongsQuantity>{songs.length} songs</SongsQuantity>
            <PlayNowButton onClick={onPlayAll}>
              <Play /> Play Now
            </PlayNowButton>
          </PlaylistDetails>
        </PlaylistInfo>
      </Header>
      <SongList>
        {songs.map((song, index) => (
          <SongItem key={song.path ?? index} $active={song.path === activePath} onClick={() => onSongClick?.(song)}>
            <AlbumImage metadata={song} height="3rem" width="3rem" />
            <SongInfo>
              <SongTitle>{song.title}</SongTitle>
              <SongArtist>{song.artist}</SongArtist>
            </SongInfo>
            <SongDuration>{song.duration?.duration_formatted}</SongDuration>
          </SongItem>
        ))}
      </SongList>
    </PlaylistContainer>
  );
};

export default Playlist;
