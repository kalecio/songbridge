import { useState } from 'react';
import Slider from '../Slider/Slider';
import { Heart, VolumeContainer, VolumeHigh, VolumeLow, VolumeOff, VolumeXmark } from './styles';
import { invoke } from '@tauri-apps/api/core';

const Volume = () => {
  const [volume, setVolume] = useState(70);
  const [isVolumeOff, setVolumeOff] = useState(false);
  const [isFavorite, setFavorite] = useState(false);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value);
    invoke('set_volume', { volume: newValue / 100 });
    setVolume(newValue);
  };

  const renderVolumeIcon = (volume: number, onClick: () => void) => {
    if (volume >= 0 && volume < 33) {
      return <VolumeOff aria-label="volume-off" onClick={onClick} />;
    } else if (volume >= 33 && volume < 66) {
      return <VolumeLow aria-label="volume-low" onClick={onClick} />;
    } else if (volume >= 66) {
      return <VolumeHigh aria-label="volume-high" onClick={onClick} />;
    }
  };

  const handleToggleVolume = async () => {
    await invoke('toggle_mute');
    setVolumeOff(!isVolumeOff);
  };

  return (
    <VolumeContainer>
      <Heart
        aria-label="favorite"
        aria-pressed={isFavorite}
        $isFavorite={isFavorite}
        onClick={() => setFavorite(!isFavorite)}
      />
      {isVolumeOff ? (
        <VolumeXmark aria-label="volume-muted" onClick={handleToggleVolume} />
      ) : (
        renderVolumeIcon(volume, handleToggleVolume)
      )}
      <Slider onChange={handleVolumeChange} min={0} max={100} value={isVolumeOff ? 0 : volume} />
    </VolumeContainer>
  );
};

export default Volume;
