import { FaShuffle, FaForward, FaBackward, FaPlay, FaPause } from 'react-icons/fa6';
import { styled } from 'styled-components';
import { RepeatMode } from '../../types';

const ControlsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
  width: 100%;
  flex: 1;
  max-width: 380px;
  min-width: 220px;
`;

const Shuffle = styled(FaShuffle)<{ $onShuffle: boolean }>`
  width: 44px;
  height: 24px;
  max-width: 44px;
  flex-shrink: 1;
  cursor: pointer;
  color: ${(props) => (props.$onShuffle ? props.theme.accent : props.theme.primaryDark)};
`;

const Next = styled(FaForward)`
  width: 44px;
  height: 24px;
  max-width: 44px;
  flex-shrink: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

const Prev = styled(FaBackward)`
  width: 44px;
  height: 24px;
  max-width: 44px;
  flex-shrink: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

const RepeatButton = styled.button<{ $onRepeat: RepeatMode }>`
  background: none;
  border: none;
  padding: 0;
  width: 44px;
  height: 24px;
  max-width: 44px;
  flex-shrink: 1;
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
    width: 44px;
    height: 28px;
    max-width: 44px;
    flex-shrink: 1;
  }

  &:focus,
  &:active {
    outline: none;
  }
`;

const Play = styled(FaPlay)`
  width: 44px;
  height: 24px;
  max-width: 44px;
  flex-shrink: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

const Pause = styled(FaPause)`
  width: 44px;
  height: 24px;
  max-width: 44px;
  flex-shrink: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.accent};
`;

const CurrentTime = styled.div`
  font-size: 12px;
  font-family: monospace;
  color: ${({ theme }) => theme.accent};
  min-width: 90px;
  text-align: center;
  margin-top: -1.5rem;
  margin-bottom: 10px;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
`;

export { ControlsContainer, Shuffle, Next, Prev, RepeatButton, Play, Pause, CurrentTime, Container };
