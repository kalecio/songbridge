import { useState } from 'react';
import Slider from '../Slider/Slider';
import { Heart, VolumeContainer, VolumeHigh, VolumeLow, VolumeOff, VolumeXmark } from './styles';

const Volume = () => {
  const [volume, setVolume] = useState(70);
  const [isVolumeOff, setVolumeOff] = useState(false);
  const [isFavorite, setFavorite] = useState(false);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value);
    setVolume(newValue);
  };

  const renderVolumeIcon = (volume: number) => {
    if (volume >= 0 && volume < 33) {
        return <VolumeOff onClick={() => setVolumeOff(!isVolumeOff)} />;
    } else if (volume >= 33 && volume < 66) {
        return <VolumeLow onClick={() => setVolumeOff(!isVolumeOff)} />;
    } else if (volume >= 66) {
        return <VolumeHigh onClick={() => setVolumeOff(!isVolumeOff)} />;
    }
};
  
  return (
        <VolumeContainer>
          <Heart $isFavorite={isFavorite} onClick={() => setFavorite(!isFavorite)} />
          {isVolumeOff ? <VolumeXmark onClick={() => setVolumeOff(!isVolumeOff)} /> : renderVolumeIcon(volume)}
          <Slider onChange={handleVolumeChange} min={0} max={100} value={volume} />
        </VolumeContainer>
  );
};

export default Volume;
