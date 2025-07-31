import { FaShuffle, FaForward, FaBackward, FaRepeat, FaPlay, FaPause } from 'react-icons/fa6';
import { styled } from 'styled-components';

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
`;

const Shuffle = styled(FaShuffle)<{ $onShuffle: boolean }>`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: ${(props) => (props.$onShuffle ? '#f49bab' : '#7f55b1')};
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

const Repeat = styled(FaRepeat)<{ $onRepeat: boolean }>`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: ${(props) => (props.$onRepeat ? '#f49bab' : '#7f55b1')};
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

export { Controls, Shuffle, Next, Prev, Repeat, Play, Pause };
