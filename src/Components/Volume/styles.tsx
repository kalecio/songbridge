import { FaVolumeXmark, FaVolumeOff, FaVolumeLow, FaVolumeHigh, FaHeart } from 'react-icons/fa6';
import { styled } from 'styled-components';

const VolumeXmark = styled(FaVolumeXmark)`
  width: 25px;
  height: 25px;
  color: #f49bab;
  cursor: pointer;
`;

const VolumeOff = styled(FaVolumeOff)`
  width: 25px;
  height: 25px;
  color: #f49bab;
  cursor: pointer;
`;

const VolumeLow = styled(FaVolumeLow)`
  width: 25px;
  height: 25px;
  color: #f49bab;
  cursor: pointer;
`;

const VolumeHigh = styled(FaVolumeHigh)`
  width: 25px;
  height: 25px;
  color: #f49bab;
  cursor: pointer;
`;

const Heart = styled(FaHeart)<{ $isFavorite: boolean }>`
  width: 25px;
  height: 25px;
  color: ${(props) => (props.$isFavorite ? '#f49bab' : '#7f55b1')};
  cursor: pointer;
`;

const VolumeContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
`;

export { VolumeContainer, VolumeXmark, VolumeOff, VolumeLow, VolumeHigh, Heart };
