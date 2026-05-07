import { useContext, useEffect, useRef, useState } from 'react';
import Slider from '../Slider/Slider';
import { Heart, VolumeContainer, VolumeHigh, VolumeLow, VolumeOff, VolumeXmark } from './styles';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { useFavourites } from '../../hooks/useFavourites';
import { AUDIO_EVENTS } from '../../audioEvents';

const Volume = () => {
  const [volume, setVolume] = useState(70);
  const [isVolumeOff, setVolumeOff] = useState(false);

  const { currentPath, metadata, library } = useContext(AppContext);
  const { isFavourite, toggleFavourite } = useFavourites();
  const isFav = isFavourite(currentPath);
  const canFavourite = Boolean(currentPath);

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

  // Bridge the mute keyboard shortcut to the existing handler. Ref keeps the
  // listener pointing at the latest closure without re-binding on every render.
  const toggleMuteRef = useRef(handleToggleVolume);
  toggleMuteRef.current = handleToggleVolume;
  useEffect(() => {
    const onMute = () => toggleMuteRef.current();
    window.addEventListener(AUDIO_EVENTS.mute, onMute);
    return () => window.removeEventListener(AUDIO_EVENTS.mute, onMute);
  }, []);

  const handleToggleFavourite = () => {
    if (!currentPath) return;
    const fromLibrary = library.find((l) => l.path === currentPath);
    toggleFavourite(fromLibrary ?? { ...(metadata ?? {}), path: currentPath });
  };

  return (
    <VolumeContainer>
      <Heart
        role="button"
        aria-label={isFav ? 'remove from favourites' : 'add to favourites'}
        aria-pressed={isFav}
        aria-disabled={!canFavourite}
        $isFavorite={isFav}
        onClick={handleToggleFavourite}
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
