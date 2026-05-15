import { useContext } from 'react';
import { AppContext } from '../Context/AppContext';
import { MetadataType } from '../types';

const pathsOf = (songs: MetadataType[]) => songs.map((s) => s.path).filter((p): p is string => Boolean(p));

export const useQueueActions = () => {
  const { currentPath, currentPlaylist, setCurrentPath, setCurrentPlaylist } = useContext(AppContext);

  const playSongs = (songs: MetadataType[]) => {
    const paths = pathsOf(songs);
    if (paths.length === 0) return;
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(paths[0]);
  };

  const addToQueue = (songs: MetadataType[]) => {
    const newPaths = pathsOf(songs).filter((p) => !currentPlaylist.includes(p));
    if (newPaths.length === 0) return;
    setCurrentPlaylist?.([...currentPlaylist, ...newPaths]);
  };

  const playNext = (song: MetadataType) => {
    if (!song.path) return;
    const filtered = currentPlaylist.filter((p) => p !== song.path);
    const idx = currentPath ? filtered.indexOf(currentPath) : -1;
    const insertAt = idx >= 0 ? idx + 1 : 0;
    const next = [...filtered.slice(0, insertAt), song.path, ...filtered.slice(insertAt)];
    setCurrentPlaylist?.(next);
  };

  const removeFromQueue = (path?: string) => {
    if (!path) return;
    setCurrentPlaylist?.(currentPlaylist.filter((p) => p !== path));
    if (currentPath === path) setCurrentPath?.(undefined);
  };

  const reorderQueue = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const max = currentPlaylist.length - 1;
    if (fromIndex < 0 || fromIndex > max || toIndex < 0 || toIndex > max) return;
    const next = [...currentPlaylist];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setCurrentPlaylist?.(next);
  };

  return { playSongs, addToQueue, playNext, removeFromQueue, reorderQueue };
};
