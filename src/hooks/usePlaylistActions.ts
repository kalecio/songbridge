import { useContext } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../Context/AppContext';
import { useModal } from '../Context/ModalContext';
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
  const { confirm, prompt } = useModal();

  const renamePlaylist = async (playlist: PlaylistType) => {
    if (isFavouritesPlaylist(playlist.id)) return;
    const raw = await prompt({
      title: 'Rename playlist',
      defaultValue: playlist.name,
      confirmLabel: 'Rename',
    });
    const next = raw?.trim();
    if (!next || next === playlist.name) return;
    const updated: PlaylistType = { ...playlist, name: next };
    setPlaylists?.((prev) => prev.map((p) => (p.id === playlist.id ? updated : p)));
    persist(updated);
  };

  const deletePlaylist = async (playlist: PlaylistType) => {
    if (isFavouritesPlaylist(playlist.id)) return;
    const ok = await confirm({
      title: 'Delete playlist',
      message: `Delete "${playlist.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
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

  const addSongToPlaylist = (playlist: PlaylistType, song: MetadataType) => {
    if (!song.path) return;
    if (playlist.songs.some((s) => s.path === song.path)) return;
    const updated: PlaylistType = { ...playlist, songs: [...playlist.songs, song] };
    setPlaylists?.((prev) => prev.map((p) => (p.id === playlist.id ? updated : p)));
    persist(updated);
  };

  const reorderSongsInPlaylist = (playlist: PlaylistType, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const max = playlist.songs.length - 1;
    if (fromIndex < 0 || fromIndex > max || toIndex < 0 || toIndex > max) return;
    const next = [...playlist.songs];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const updated: PlaylistType = { ...playlist, songs: next };
    setPlaylists?.((prev) => prev.map((p) => (p.id === playlist.id ? updated : p)));
    persist(updated);
  };

  return { renamePlaylist, deletePlaylist, removeSongFromPlaylist, addSongToPlaylist, reorderSongsInPlaylist };
};
