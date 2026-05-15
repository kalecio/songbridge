import { useContext } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../Context/AppContext';
import { MetadataType, PlaylistType } from '../types';
import { isFavouritesPlaylist } from './useFavourites';

const persist = (pl: PlaylistType) =>
  invoke('db_upsert_playlist', {
    id: pl.id,
    name: pl.name,
    songs: pl.songs.map((s) => ({ path: s.path, title: s.title ?? null, artist: s.artist ?? null })),
  }).catch(() => {});

export const usePlaylistActions = () => {
  const { setPlaylists } = useContext(AppContext);

  const renamePlaylist = (playlist: PlaylistType) => {
    if (isFavouritesPlaylist(playlist.id)) return;
    const next = window.prompt('Rename playlist', playlist.name)?.trim();
    if (!next || next === playlist.name) return;
    const updated: PlaylistType = { ...playlist, name: next };
    setPlaylists?.((prev) => prev.map((p) => (p.id === playlist.id ? updated : p)));
    persist(updated);
  };

  const deletePlaylist = (playlist: PlaylistType) => {
    if (isFavouritesPlaylist(playlist.id)) return;
    if (!window.confirm(`Delete playlist "${playlist.name}"?`)) return;
    setPlaylists?.((prev) => prev.filter((p) => p.id !== playlist.id));
    invoke('db_delete_playlist', { id: playlist.id }).catch(() => {});
  };

  const removeSongFromPlaylist = (playlist: PlaylistType, song: MetadataType) => {
    if (!song.path) return;
    const updated: PlaylistType = {
      ...playlist,
      songs: playlist.songs.filter((s) => s.path !== song.path),
    };
    setPlaylists?.((prev) => prev.map((p) => (p.id === playlist.id ? updated : p)));
    persist(updated);
  };

  return { renamePlaylist, deletePlaylist, removeSongFromPlaylist };
};
