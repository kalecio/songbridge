import { useContext, useState } from 'react';
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

  const playNewSong = async () => {
    try {
      // Get metadata for the song first to get duration
      const metadata = await invoke<MetadataType>('get_metadata', { path });

      // Extract duration in seconds
      const durationSeconds = metadata.duration?.duration_seconds
        ? typeof metadata.duration.duration_seconds === 'string'
          ? parseInt(metadata.duration.duration_seconds)
          : metadata.duration.duration_seconds
        : undefined;

      // Play the song with duration
      await invoke('play_new_song', { path, durationSeconds: durationSeconds });

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
