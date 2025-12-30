import { useContext, useEffect, useRef } from 'react';
import Controls from '../Controls/Controls';
import ProgressBar from '../ProgressBar/ProgressBar';
import Song from '../Song/Song';
import Volume from '../Volume/Volume';
import { invoke } from '@tauri-apps/api/core';

import { PlayerContainer, StyledPlayer } from './styles';
import { AppContext } from '../../Context/AppContext';

const Player = () => {
  const context = useContext(AppContext);
  const { metadata, progress, isPlaying, setProgress } = context;
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only poll progress if playing
    if (isPlaying) {
      intervalRef.current = window.setInterval(async () => {
        try {
          const currentProgress = await invoke<number>('get_progress');
          // Convert progress (0-1) to percentage (0-100)
          setProgress?.(currentProgress * 100);
          console.log('teste', currentProgress * 100);
        } catch (error) {
          console.error('Error getting progress:', error);
        }
      }, 1000); // Update every second
    }

    // Cleanup interval on unmount or when isPlaying changes
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, setProgress]);

  return (
    <PlayerContainer>
      <ProgressBar progress={progress ?? 0} max={100} />
      <StyledPlayer>
        <Song
          albumImage={metadata?.image}
          albumName={metadata?.album}
          songName={metadata?.title ?? 'no name'}
          artistName={metadata?.artist ?? 'no name'}
        />
        <Controls />
        <Volume />
      </StyledPlayer>
    </PlayerContainer>
  );
};

export default Player;
