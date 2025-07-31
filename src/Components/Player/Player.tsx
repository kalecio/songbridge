import ProgressBar from '../ProgressBar/ProgressBar';
import Slider from '../Slider/Slider';
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
        <Volume>
          <Slider min={0} max={100} value={70} />
        </Volume>
      </StyledPlayer>
    </PlayerContainer>
  );
};

export default Player;
