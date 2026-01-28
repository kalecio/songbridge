import { useContext, useEffect, useState } from 'react';
import { Controls, Shuffle, Prev, Play, Next, Repeat, Pause } from './styles';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';

const Player = () => {
  const [isSongLoaded, setIsSongLoaded] = useState(false);
  const [onRepeat, setOnRepeat] = useState(false);
  const [onShuffle, setOnShuffle] = useState(false);

  const context = useContext(AppContext);
  const { isPlaying, setIsPlaying, setCurrentPath, setMetadata, currentPath: path } = context;

  useEffect(() => {
    if (!path) {
      return;
    }
    const loadSong = async () => {
      await playNewSong();
    };
    loadSong();
  }, [path]);

  const playNewSong = async () => {
    try {
      // Get metadata for the song first to get duration
      const metadata = await invoke<MetadataType>('get_metadata', { path });

      await invoke('load_song', { path });
      await invoke('play_song');

      // Update context
      setCurrentPath?.(path);
      setIsPlaying?.(true);
      setMetadata?.(metadata);
      setIsSongLoaded(true);
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  const pause = async () => {
    try {
      await invoke('pause');
      setIsPlaying?.(false);
    } catch (error) {
      console.error('Error pausing:', error);
    }
  };

  const resume = async () => {
    try {
      await invoke('resume');
      setIsPlaying?.(true);
    } catch (error) {
      console.error('Error resuming:', error);
    }
  };

  return (
    <Controls>
      <Shuffle $onShuffle={onShuffle} onClick={() => setOnShuffle(!onShuffle)} />
      <Prev onClick={playNewSong} />
      {isPlaying ? <Pause onClick={pause} /> : <Play onClick={isSongLoaded ? resume : playNewSong} />}
      <Next onClick={playNewSong} />
      <Repeat $onRepeat={onRepeat} onClick={() => setOnRepeat(!onRepeat)} />
    </Controls>
  );
};

export default Player;
