import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ControlsContainer, Shuffle, Prev, Play, Next, RepeatButton, Pause, CurrentTime, Container } from './styles';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { error as logError } from '../../logger';
import { MetadataType, RepeatMode } from '../../types';
import { AUDIO_EVENTS } from '../../audioEvents';
import { TbRepeat, TbRepeatOnce } from 'react-icons/tb';

const Controls = () => {
  const [isSongLoaded, setIsSongLoaded] = useState(false);

  const context = useContext(AppContext);
  const {
    isPlaying,
    setIsPlaying,
    setCurrentPath,
    setMetadata,
    currentPath: path,
    currentPlaylist,
    onRepeat,
    setOnRepeat,
    onShuffle,
    setOnShuffle,
    progress,
    metadata,
  } = context;

  const playNewSong = useCallback(async () => {
    try {
      const metadata = await invoke<MetadataType>('get_metadata', { path });
      await invoke('load_song', { path });
      await invoke('play_song');
      setCurrentPath?.(path);
      setIsPlaying?.(true);
      setMetadata?.(metadata);
      setIsSongLoaded(true);
    } catch (error) {
      logError(`Failed to play song '${path}': ${error}`).catch(() => {});
    }
  }, [path, setCurrentPath, setIsPlaying, setMetadata]);

  useEffect(() => {
    if (!path) return;
    playNewSong();
  }, [path, playNewSong]);

  const handleNextSong = async () => {
    if (onShuffle) {
      const randomIndex = Math.floor(Math.random() * currentPlaylist.length);
      const randomPath = currentPlaylist[randomIndex];
      setCurrentPath?.(randomPath);
      return;
    }
    const currentIndex = currentPlaylist.indexOf(path!);
    const nextIndex = (currentIndex + 1) % currentPlaylist.length;
    const nextPath = currentPlaylist[nextIndex];
    setCurrentPath?.(nextPath);
  };

  const handlePreviousSong = async () => {
    if (onShuffle) {
      const randomIndex = Math.floor(Math.random() * currentPlaylist.length);
      const randomPath = currentPlaylist[randomIndex];
      setCurrentPath?.(randomPath);
      return;
    }
    const currentIndex = currentPlaylist.indexOf(path!);
    const previousIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    const previousPath = currentPlaylist[previousIndex];
    setCurrentPath?.(previousPath);
  };

  const pause = async () => {
    try {
      await invoke('pause');
      setIsPlaying?.(false);
    } catch (error) {
      logError(`Pause failed: ${error}`).catch(() => {});
    }
  };

  const resume = async () => {
    try {
      await invoke('resume');
      setIsPlaying?.(true);
    } catch (error) {
      logError(`Resume failed: ${error}`).catch(() => {});
    }
  };

  const togglePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else if (isSongLoaded) {
      await resume();
    } else if (path) {
      await playNewSong();
    }
  };

  const handleToggleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(onRepeat);
    const nextIndex = (currentIndex + 1) % modes.length;
    setOnRepeat?.(modes[nextIndex]);
  }, [onRepeat, setOnRepeat]);

  const handlersRef = useRef({
    togglePlayPause,
    handleNextSong,
    handlePreviousSong,
    toggleShuffle: () => setOnShuffle?.(!onShuffle),
    toggleRepeat: handleToggleRepeat,
  });
  handlersRef.current = {
    togglePlayPause,
    handleNextSong,
    handlePreviousSong,
    toggleShuffle: () => setOnShuffle?.(!onShuffle),
    toggleRepeat: handleToggleRepeat,
  };

  useEffect(() => {
    const onPlayPause = () => handlersRef.current.togglePlayPause();
    const onNext = () => handlersRef.current.handleNextSong();
    const onPrev = () => handlersRef.current.handlePreviousSong();
    const onShuffleEvt = () => handlersRef.current.toggleShuffle();
    const onRepeatEvt = () => handlersRef.current.toggleRepeat();
    window.addEventListener(AUDIO_EVENTS.playPause, onPlayPause);
    window.addEventListener(AUDIO_EVENTS.next, onNext);
    window.addEventListener(AUDIO_EVENTS.previous, onPrev);
    window.addEventListener(AUDIO_EVENTS.shuffle, onShuffleEvt);
    window.addEventListener(AUDIO_EVENTS.repeat, onRepeatEvt);
    return () => {
      window.removeEventListener(AUDIO_EVENTS.playPause, onPlayPause);
      window.removeEventListener(AUDIO_EVENTS.next, onNext);
      window.removeEventListener(AUDIO_EVENTS.previous, onPrev);
      window.removeEventListener(AUDIO_EVENTS.shuffle, onShuffleEvt);
      window.removeEventListener(AUDIO_EVENTS.repeat, onRepeatEvt);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const adjustedM = m - h * 60; // Adjust minutes to be within the hour
      return `${h}:${adjustedM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  const totalSeconds = metadata?.duration?.duration_seconds ?? 0;
  const currentSeconds = Math.floor((progress / 100) * totalSeconds);
  const currentTimeStr = `${formatTime(currentSeconds)} / ${formatTime(totalSeconds)}`;

  return (
    <Container>
      <CurrentTime>{currentTimeStr}</CurrentTime>
      <ControlsContainer>
        <Shuffle aria-label="shuffle" $onShuffle={onShuffle} onClick={() => setOnShuffle?.(!onShuffle)} />
        <Prev aria-label="previous" onClick={handlePreviousSong} />
        {isPlaying ? (
          <Pause aria-label="pause" onClick={pause} />
        ) : (
          <Play aria-label="play" onClick={isSongLoaded ? resume : playNewSong} />
        )}
        <Next aria-label="next" onClick={handleNextSong} />
        <RepeatButton aria-label="repeat" $onRepeat={onRepeat} onClick={handleToggleRepeat}>
          {onRepeat === 'one' ? <TbRepeatOnce /> : <TbRepeat />}
        </RepeatButton>
      </ControlsContainer>
    </Container>
  );
};

export default Controls;
