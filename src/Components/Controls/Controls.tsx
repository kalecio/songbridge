import { useCallback, useContext, useEffect, useState } from 'react';
import { Controls, Shuffle, Prev, Play, Next, Repeat, Pause } from './styles';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { error as logError } from '../../logger';
import { MetadataType } from '../../types';

const Player = () => {
  const [isSongLoaded, setIsSongLoaded] = useState(false);

  const context = useContext(AppContext);
  const {
    isPlaying,
    setIsPlaying,
    setCurrentPath,
    setMetadata,
    currentPath: path,
    currentPlaylist,
    onRepeat,
    setOnRepeat,
    onShuffle,
    setOnShuffle,
  } = context;

  const playNewSong = useCallback(async () => {
    try {
      const metadata = await invoke<MetadataType>('get_metadata', { path });
      await invoke('load_song', { path });
      await invoke('play_song');
      setCurrentPath?.(path);
      setIsPlaying?.(true);
      setMetadata?.(metadata);
      setIsSongLoaded(true);
    } catch (error) {
      logError(`Failed to play song '${path}': ${error}`).catch(() => {});
    }
  }, [path, setCurrentPath, setIsPlaying, setMetadata]);

  useEffect(() => {
    if (!path) return;
    playNewSong();
  }, [path, playNewSong]);

  const handleNextSong = async () => {
    if (onShuffle) {
      const randomIndex = Math.floor(Math.random() * currentPlaylist.length);
      const randomPath = currentPlaylist[randomIndex];
      setCurrentPath?.(randomPath);
      return;
    }
    const currentIndex = currentPlaylist.indexOf(path!);
    const nextIndex = (currentIndex + 1) % currentPlaylist.length;
    const nextPath = currentPlaylist[nextIndex];
    setCurrentPath?.(nextPath);
  };

  const handlePreviousSong = async () => {
    if (onShuffle) {
      const randomIndex = Math.floor(Math.random() * currentPlaylist.length);
      const randomPath = currentPlaylist[randomIndex];
      setCurrentPath?.(randomPath);
      return;
    }
    const currentIndex = currentPlaylist.indexOf(path!);
    const previousIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    const previousPath = currentPlaylist[previousIndex];
    setCurrentPath?.(previousPath);
  };

  const pause = async () => {
    try {
      await invoke('pause');
      setIsPlaying?.(false);
    } catch (error) {
      logError(`Pause failed: ${error}`).catch(() => {});
    }
  };

  const resume = async () => {
    try {
      await invoke('resume');
      setIsPlaying?.(true);
    } catch (error) {
      logError(`Resume failed: ${error}`).catch(() => {});
    }
  };

  return (
    <Controls>
      <Shuffle aria-label="shuffle" $onShuffle={onShuffle} onClick={() => setOnShuffle?.(!onShuffle)} />
      <Prev aria-label="previous" onClick={handlePreviousSong} />
      {isPlaying ? (
        <Pause aria-label="pause" onClick={pause} />
      ) : (
        <Play aria-label="play" onClick={isSongLoaded ? resume : playNewSong} />
      )}
      <Next aria-label="next" onClick={handleNextSong} />
      <Repeat aria-label="repeat" $onRepeat={onRepeat} onClick={() => setOnRepeat?.(!onRepeat)} />
    </Controls>
  );
};

export default Player;
