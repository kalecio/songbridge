import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { FaListUl } from 'react-icons/fa6';
import Slider from '../Slider/Slider';
import { Heart, LyricsIcon, VolumeContainer, VolumeHigh, VolumeLow, VolumeOff, VolumeXmark } from './styles';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { useFavourites } from '../../hooks/useFavourites';
import { AUDIO_EVENTS } from '../../audioEvents';
import { useI18n } from '../../i18n/I18nProvider';

const Volume = ({ showFavourite = true }: { showFavourite?: boolean }) => {
  const { t } = useI18n();
  const [volume, setVolume] = useState(70);
  const [isVolumeOff, setVolumeOff] = useState(false);

  const { currentPath, metadata, library, showQueue, setShowQueue } = useContext(AppContext);
  const { isFavourite, toggleFavourite } = useFavourites();
  const navigate = useNavigate();
  const location = useLocation();
  const isLyricsActive = location.pathname === '/lyrics';
  const isFav = isFavourite(currentPath);
  const canFavourite = Boolean(currentPath);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value);
    invoke('set_volume', { volume: newValue / 100 });
    setVolume(newValue);
  };

  const renderVolumeIcon = (volume: number, onClick: () => void) => {
    if (volume >= 0 && volume < 33) {
      return <VolumeOff aria-label={t('common.volumeOff')} onClick={onClick} />;
    } else if (volume >= 33 && volume < 66) {
      return <VolumeLow aria-label={t('common.volumeLow')} onClick={onClick} />;
    } else if (volume >= 66) {
      return <VolumeHigh aria-label={t('common.volumeHigh')} onClick={onClick} />;
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
      <button
        type="button"
        aria-label={t('common.playingNow')}
        aria-pressed={Boolean(showQueue)}
        onClick={() => setShowQueue?.(!showQueue)}
      >
        <FaListUl />
      </button>
      <LyricsIcon
        aria-label={t('common.lyrics')}
        $active={isLyricsActive}
        onClick={() => navigate(isLyricsActive ? '/' : '/lyrics')}
      />
      {showFavourite && (
        <Heart
          role="button"
          aria-label={t(isFav ? 'common.removeFavourite' : 'common.addFavourite')}
          aria-pressed={isFav}
          aria-disabled={!canFavourite}
          $isFavorite={isFav}
          onClick={handleToggleFavourite}
        />
      )}
      {isVolumeOff ? (
        <VolumeXmark aria-label={t('common.volumeMuted')} onClick={handleToggleVolume} />
      ) : (
        renderVolumeIcon(volume, handleToggleVolume)
      )}
      <Slider onChange={handleVolumeChange} min={0} max={100} value={isVolumeOff ? 0 : volume} />
    </VolumeContainer>
  );
};

export default Volume;
