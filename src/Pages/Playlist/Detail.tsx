import { useContext } from 'react';
import { useParams } from 'react-router';
import { AppContext } from '../../Context/AppContext';
import { MetadataType, PlaylistType } from '../../types';
import Playlist from '../../Components/Playlist/Playlist';
import { usePlaylistActions } from '../../hooks/usePlaylistActions';
import { usePlayHistory } from '../../hooks/usePlayHistory';

const Detail = ({ playlists }: { playlists?: PlaylistType[] }) => {
  const { id } = useParams<{ id: string }>();
  const { currentPath, setCurrentPath, setCurrentPlaylist, library } = useContext(AppContext);
  const { removeSongFromPlaylist } = usePlaylistActions();
  const { recordPlaylistPlay } = usePlayHistory();

  const playlist = playlists?.find((p) => p.id === id);
  const songs = (playlist?.songs ?? []).map((song) => {
    const match = library.find((l) => l.path === song.path);
    if (!match) return song;
    return { ...match, title: song.title ?? match.title, artist: song.artist ?? match.artist };
  });

  const playSong = (song: MetadataType) => {
    const paths = songs.map((s) => s.path).filter((p): p is string => Boolean(p));
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(song.path);
    if (playlist) recordPlaylistPlay(playlist.id);
  };

  const handleRemove = (song: MetadataType) => {
    if (!playlist) return;
    removeSongFromPlaylist(playlist, song);
  };

  return (
    <Playlist
      songs={songs}
      name={playlist?.name ?? ''}
      type="Playlist"
      activePath={currentPath}
      onSongClick={(song) => playSong(song)}
      onPlayAll={() => songs[0] && playSong(songs[0])}
      onRemoveMissing={handleRemove}
      onRemoveSong={playlist ? handleRemove : undefined}
    />
  );
};

export default Detail;
