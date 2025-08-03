import { invoke } from '@tauri-apps/api/core';
import Controls from '../Controls/Controls';
import ProgressBar from '../ProgressBar/ProgressBar';
import Song from '../Song/Song';
import Volume from '../Volume/Volume';

import { PlayerContainer, StyledPlayer } from './styles';
import { useEffect, useState } from 'react';

const Player = () => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(100);

  useEffect(() => {
    invoke('load_song', { path: 'music-files/Polygondwanaland.mp3' });
    invoke<number>('get_current_track_duration').then((dur) => {
      console.log('Duration received:', dur);
      if (typeof dur === 'number') setDuration(dur);
    });

    const interval = setInterval(async () => {
      const pos = await invoke<number>('get_progress');
      console.log('Current position:', pos);
      if (typeof pos === 'number' && duration > 0) {
        setProgress((pos / duration) * 100);
        console.log('Progress updated:', (pos / duration) * 100);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [duration]);

  const handleSeek = async (percent: number) => {
    const filePath = 'music-files/Polygondwanaland.mp3';
    await invoke('seek', { percent, filePath: filePath });
  };
  return (
    <PlayerContainer>
      <ProgressBar progress={progress} max={100} onSeek={handleSeek} />
      <StyledPlayer>
        <Song songName="Song Name" artistName="Artist Name" />
        <Controls />
        <Volume />
      </StyledPlayer>
    </PlayerContainer>
  );
};

export default Player;
