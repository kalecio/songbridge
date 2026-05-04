import { FaShuffle, FaForward, FaBackward, FaRepeat, FaPlay, FaPause } from 'react-icons/fa6';
import { styled } from 'styled-components';

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  width: 400px;
`;

const Shuffle = styled(FaShuffle)<{ $onShuffle: boolean }>`
  width: 60px;
  height: 30px;
  cursor: pointer;
  color: ${(props) => (props.$onShuffle ? props.theme.accent : props.theme.primaryDark)};
`;

const Next = styled(FaForward)`
  width: 60px;
  height: 30px;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

const Prev = styled(FaBackward)`
  width: 60px;
  height: 30px;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

const Repeat = styled(FaRepeat)<{ $onRepeat: boolean }>`
  width: 60px;
  height: 30px;
  cursor: pointer;
  color: ${(props) => (props.$onRepeat ? props.theme.accent : props.theme.primaryDark)};
`;

const Play = styled(FaPlay)`
  width: 60px;
  height: 30px;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

const Pause = styled(FaPause)`
  width: 60px;
  height: 30px;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

export { Controls, Shuffle, Next, Prev, Repeat, Play, Pause };
