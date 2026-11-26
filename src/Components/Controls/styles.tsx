import { FaShuffle, FaForwardStep, FaBackwardStep, FaPlay, FaPause } from 'react-icons/fa6';
import { styled } from 'styled-components';
import { RepeatMode } from '../../types';

const ControlsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  width: 100%;
  flex: 1;
  max-width: 260px;
  min-width: 220px;
`;

const Shuffle = styled(FaShuffle)<{ $onShuffle: boolean }>`
  width: 18px;
  height: 16px;
  max-width: 18px;
  flex-shrink: 1;
  cursor: pointer;
  color: ${(props) => (props.$onShuffle ? props.theme.accent : props.theme.textSecondary)};
`;

const Next = styled(FaForwardStep)`
  width: 18px;
  height: 16px;
  max-width: 18px;
  flex-shrink: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.textSecondary};
`;

const Prev = styled(FaBackwardStep)`
  width: 18px;
  height: 16px;
  max-width: 18px;
  flex-shrink: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.textSecondary};
`;

const RepeatButton = styled.button<{ $onRepeat: RepeatMode }>`
  background: none;
  border: none;
  padding: 0;
  width: 18px;
  height: 16px;
  max-width: 18px;
  flex-shrink: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => {
    if (props.$onRepeat === 'one' || props.$onRepeat === 'all') {
      return props.theme.accent;
    }
    return props.theme.textSecondary;
  }};

  & svg {
    width: 18px;
    height: 18px;
    max-width: 18px;
    flex-shrink: 1;
  }

  &:focus,
  &:active {
    outline: none;
  }
`;

const Play = styled(FaPlay)`
  width: 18px;
  height: 16px;
  max-width: 18px;
  flex-shrink: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.textSecondary};
`;

const Pause = styled(FaPause)`
  width: 18px;
  height: 16px;
  max-width: 18px;
  flex-shrink: 1;
  cursor: pointer;
  color: ${({ theme }) => theme.textSecondary};
`;

const TransportButton = styled.button<{ $primary?: boolean }>`
  border: 0;
  background: ${({ $primary, theme }) => ($primary ? theme.accent : 'transparent')};
  width: ${({ $primary }) => ($primary ? '34px' : '28px')};
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  svg {
    color: ${({ $primary, theme }) => ($primary ? theme.background : theme.textSecondary)};
    width: 14px;
    height: 14px;
  }
  &[aria-pressed='true'] svg {
    color: ${({ theme }) => theme.accent};
  }
`;
const CurrentTime = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
`;
const Timeline = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  time {
    font-size: 9px;
    color: ${({ theme }) => theme.textMuted};
    font-variant-numeric: tabular-nums;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
`;

export {
  Timeline,
  TransportButton,
  ControlsContainer,
  Shuffle,
  Next,
  Prev,
  RepeatButton,
  Play,
  Pause,
  CurrentTime,
  Container,
};
