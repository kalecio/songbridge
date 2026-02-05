import { useContext, useEffect, useState } from 'react';
import { Controls, Shuffle, Prev, Play, Next, Repeat, Pause } from './styles';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
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
      <Shuffle $onShuffle={onShuffle} onClick={() => setOnShuffle?.(!onShuffle)} />
      <Prev onClick={handlePreviousSong} />
      {isPlaying ? <Pause onClick={pause} /> : <Play onClick={isSongLoaded ? resume : playNewSong} />}
      <Next onClick={handleNextSong} />
      <Repeat
        $onRepeat={onRepeat}
        onClick={() => {
          console.log('repeat clicked 1', onRepeat);
          setOnRepeat?.(!onRepeat);
          console.log('repeat clicked 2', onRepeat);
        }}
      />
    </Controls>
  );
};

export default Player;
