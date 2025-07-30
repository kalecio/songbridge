import ProgressBar from '../ProgressBar/ProgressBar';
import Song from '../Song/Song';

import { PlayerContainer, StyledPlayer, Controls, Shuffle, Prev, Play, Next, Repeat, Volume } from './styles';

const Player = () => {
  return (
    <PlayerContainer>
      <ProgressBar progress="70%" />
      <StyledPlayer>
        <Song songName="Song Name" artistName="Artist Name" />
        <Controls>
          <Shuffle />
          <Prev />
          <Play />
          <Next />
          <Repeat />
        </Controls>
        <Volume>volume</Volume>
      </StyledPlayer>
    </PlayerContainer>
  );
};

export default Player;
