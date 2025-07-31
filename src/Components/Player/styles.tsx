import {
  FaShuffle,
  FaForward,
  FaBackward,
  FaRepeat,
  FaPlay,
  FaPause,
} from 'react-icons/fa6';
import { styled } from 'styled-components';

const PlayerContainer = styled.div`
  background-color: #9b7ebd;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
  min-height: 100px;
  max-height: 10%;
`;

const StyledPlayer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
`;

const Shuffle = styled(FaShuffle)`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: #7f55b1;
`;

const Next = styled(FaForward)`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: #f49bab;
`;

const Prev = styled(FaBackward)`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: #f49bab;
`;

const Repeat = styled(FaRepeat)`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: #7f55b1;
`;

const Play = styled(FaPlay)`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: #f49bab;
`;

const Pause = styled(FaPause)`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: #f49bab;
`;

export {
  PlayerContainer,
  StyledPlayer,
  Controls,
  Shuffle,
  Next,
  Prev,
  Repeat,
  Play,
  Pause,
};
