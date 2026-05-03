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
  color: ${(props) => (props.$onShuffle ? props.theme.accent : props.theme.primaryDark)};
`;

const Next = styled(FaForward)`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

const Prev = styled(FaBackward)`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

const Repeat = styled(FaRepeat)<{ $onRepeat: boolean }>`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: ${(props) => (props.$onRepeat ? props.theme.accent : props.theme.primaryDark)};
`;

const Play = styled(FaPlay)`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

const Pause = styled(FaPause)`
  max-width: 60px;
  max-height: 30px;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

export { Controls, Shuffle, Next, Prev, Repeat, Play, Pause };
