import { useParams } from 'react-router';
import styled from 'styled-components';
import { PlaylistType } from '../../types';
import AlbumImage from '../AlbumImage/AlbumImage';
import { FaCirclePlay } from 'react-icons/fa6';

const Playlist = ({ playlists }: { playlists?: PlaylistType[] }) => {
  const { id } = useParams<{ id: string }>();
  const { songs, name } = playlists?.find((p) => p.id === id) || { songs: [], name: '' };

  return (
    <PlaylistContainer>
      <Header>
        <PlaylistInfo>
          <AlbumImage metadata={songs[0]} height="10rem" width="10rem" />
          <PlaylistDetails>
            <Type>Playlist</Type>
            <PlaylistName>{name}</PlaylistName>
            <SongsQuantity>{songs.length} songs</SongsQuantity>
            <PlayNowButton>
              <Play /> Play Now
            </PlayNowButton>
          </PlaylistDetails>
        </PlaylistInfo>
      </Header>
      <SongList>
        {songs.map((song, index) => (
          <SongItem key={index}>
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

const PlaylistContainer = styled.div`
  overflow-y: hidden;
  padding: 1rem;
`;

const PlaylistInfo = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  margin-top: 3rem;
  padding: 1rem 3rem;
`;
const PlaylistDetails = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
`;

const PlayNowButton = styled.button`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 1rem 0.5rem;
  font-size: 1rem;
  gap: 0.5rem;
  max-width: 140px;
  background-color: #9b7ebd;
  color: white;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
`;

const Type = styled.span`
  font-size: 0.85rem;
  text-transform: uppercase;
  color: gray;
`;

const PlaylistName = styled.h1`
  font-size: 2rem;
  margin: 0;
`;

const SongsQuantity = styled.span`
  font-size: 0.75rem;
  color: gray;
`;

const Play = styled(FaCirclePlay)`
  max-width: 30px;
  max-height: 30px;
  cursor: pointer;
  color: #f49bab;
`;

const SongList = styled.div`
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 2rem;
  padding: 2rem 4rem 20rem 4rem;
`;

const SongItem = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  max-height: 2rem;
  gap: 1rem;
`;

const SongInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
`;

const SongDuration = styled.span`
  margin-left: auto;
  color: gray;
  width: fit-content;
`;

const SongTitle = styled.span`
  width: fit-content;
`;

const SongArtist = styled.span`
  width: fit-content;
  color: gray;
`;

const Header = styled.h2`
  height: fit-content;
  margin-bottom: 1rem;
`;

export default Playlist;
