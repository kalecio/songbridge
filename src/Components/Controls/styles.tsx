import { FaShuffle, FaForward, FaBackward, FaPlay, FaPause } from 'react-icons/fa6';
import { styled } from 'styled-components';
import { RepeatMode } from '../../types';

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

const RepeatButton = styled.button<{ $onRepeat: RepeatMode }>`
  background: none;
  border: none;
  padding: 0;
  width: 60px;
  height: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => {
    if (props.$onRepeat === 'one' || props.$onRepeat === 'all') {
      return props.theme.accent;
    }
    return props.theme.primaryDark;
  }};

  & svg {
    width: 60px;
    height: 35px;
  }

  &:focus,
  &:active {
    outline: none;
  }
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

export { Controls, Shuffle, Next, Prev, RepeatButton, Play, Pause };
