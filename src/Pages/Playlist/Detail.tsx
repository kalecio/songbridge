import { useContext } from 'react';
import { useParams } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { MetadataType, PlaylistType } from '../../types';
import Playlist from '../../Components/Playlist/Playlist';

const Detail = ({ playlists }: { playlists?: PlaylistType[] }) => {
  const { id } = useParams<{ id: string }>();
  const { currentPath, setCurrentPath, setCurrentPlaylist, setPlaylists, library } = useContext(AppContext);

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
  };

  const handleRemoveMissing = (song: MetadataType) => {
    if (!playlist) return;
    const updated = { ...playlist, songs: playlist.songs.filter((s) => s.path !== song.path) };
    setPlaylists?.((prev) => prev.map((p) => (p.id === playlist.id ? updated : p)));
    invoke('db_upsert_playlist', {
      id: playlist.id,
      name: playlist.name,
      songs: updated.songs.map((s) => ({ path: s.path, title: s.title ?? null, artist: s.artist ?? null })),
    }).catch(() => {});
  };

  return (
    <Playlist
      songs={songs}
      name={playlist?.name ?? ''}
      type="Playlist"
      activePath={currentPath}
      onSongClick={(song) => playSong(song)}
      onPlayAll={() => songs[0] && playSong(songs[0])}
      onRemoveMissing={handleRemoveMissing}
    />
  );
};

export default Detail;
