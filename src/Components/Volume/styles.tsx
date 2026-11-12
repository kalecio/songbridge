import { FaVolumeXmark, FaVolumeOff, FaVolumeLow, FaVolumeHigh, FaHeart, FaMicrophone } from 'react-icons/fa6';
import { styled } from 'styled-components';

const VolumeXmark = styled(FaVolumeXmark)`
  width: 16px;
  height: 16px;
  color: ${({ theme }) => theme.textSecondary};
  cursor: pointer;
`;

const VolumeOff = styled(FaVolumeOff)`
  width: 16px;
  height: 16px;
  color: ${({ theme }) => theme.textSecondary};
  cursor: pointer;
`;

const VolumeLow = styled(FaVolumeLow)`
  width: 16px;
  height: 16px;
  color: ${({ theme }) => theme.textSecondary};
  cursor: pointer;
`;

const VolumeHigh = styled(FaVolumeHigh)`
  width: 16px;
  height: 16px;
  color: ${({ theme }) => theme.textSecondary};
  cursor: pointer;
`;

const Heart = styled(FaHeart)<{ $isFavorite: boolean }>`
  width: 16px;
  height: 16px;
  color: ${(props) => (props.$isFavorite ? props.theme.textSecondary : props.theme.textSecondary)};
  cursor: pointer;
`;

const LyricsIcon = styled(FaMicrophone)<{ $active: boolean }>`
  width: 16px;
  height: 16px;
  color: ${({ $active, theme }) => ($active ? theme.textSecondary : theme.textMuted)};
  cursor: pointer;
`;

const VolumeContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
  min-width: 180px;
  width: 24%;
  & > button {
    display: inline-flex;
    color: ${({ theme }) => theme.textPrimary};
    background: none;
    border: 0;
    cursor: pointer;
  }
  flex-shrink: 0;
`;

export { VolumeContainer, VolumeXmark, VolumeOff, VolumeLow, VolumeHigh, Heart, LyricsIcon };
