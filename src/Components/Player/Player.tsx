import Controls from '../Controls/Controls';
import ProgressBar from '../ProgressBar/ProgressBar';
import Song from '../Song/Song';
import Volume from '../Volume/Volume';

import { PlayerContainer, StyledPlayer } from './styles';

const Player = () => {
  return (
    <PlayerContainer>
      <ProgressBar progress={70} max={100} />
      <StyledPlayer>
        <Song songName="Song Name" artistName="Artist Name" />
        <Controls />
        <Volume />
      </StyledPlayer>
    </PlayerContainer>
  );
};

export default Player;
