import { useContext } from 'react';
import { useParams } from 'react-router';
import { AppContext } from '../../Context/AppContext';
import { MetadataType, PlaylistType } from '../../types';
import Playlist from '../../Components/Playlist/Playlist';

const Detail = ({ playlists }: { playlists?: PlaylistType[] }) => {
  const { id } = useParams<{ id: string }>();
  const { currentPath, setCurrentPath, setCurrentPlaylist } = useContext(AppContext);

  const playlist = playlists?.find((p) => p.id === id);
  const songs = playlist?.songs ?? [];

  const playSong = (song: MetadataType) => {
    const paths = songs.map((s) => s.path).filter((p): p is string => Boolean(p));
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(song.path);
  };

  return (
    <Playlist
      songs={songs}
      name={playlist?.name ?? ''}
      type="Playlist"
      activePath={currentPath}
      onSongClick={(song) => playSong(song)}
      onPlayAll={() => songs[0] && playSong(songs[0])}
    />
  );
};

export default Detail;
