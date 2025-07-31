import { useState } from 'react';
import { Controls, Shuffle, Prev, Play, Next, Repeat, Pause } from './styles';

const Player = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [onRepeat, setOnRepeat] = useState(false);
  const [onShuffle, setOnShuffle] = useState(false);

  return (
    <Controls>
      <Shuffle $onShuffle={onShuffle} onClick={() => setOnShuffle(!onShuffle)} />
      <Prev />
      {isPlaying ? (
        <Pause onClick={() => setIsPlaying(!isPlaying)} />
      ) : (
        <Play onClick={() => setIsPlaying(!isPlaying)} />
      )}
      <Next />
      <Repeat $onRepeat={onRepeat} onClick={() => setOnRepeat(!onRepeat)} />
    </Controls>
  );
};

export default Player;
