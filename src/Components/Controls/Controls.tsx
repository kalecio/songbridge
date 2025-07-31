import { useState } from 'react';
import { Controls, Shuffle, Prev, Play, Next, Repeat, Pause } from './styles';
import { invoke } from '@tauri-apps/api/core';

const Player = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [onRepeat, setOnRepeat] = useState(false);
  const [onShuffle, setOnShuffle] = useState(false);

  const playNewSong = async () => {
    await invoke('play_new_song');
    setIsPlaying(true);
  };

  const pause = async () => {
    setIsPlaying(false);
    await invoke('pause');
  };

  const resume = async () => {
    setIsPlaying(true);
    await invoke('resume');
  };

  return (
    <Controls>
      <Shuffle $onShuffle={onShuffle} onClick={() => setOnShuffle(!onShuffle)} />
      <Prev onClick={playNewSong} />
      {isPlaying ? <Pause onClick={pause} /> : <Play onClick={resume} />}
      <Next onClick={playNewSong} />
      <Repeat $onRepeat={onRepeat} onClick={() => setOnRepeat(!onRepeat)} />
    </Controls>
  );
};

export default Player;
