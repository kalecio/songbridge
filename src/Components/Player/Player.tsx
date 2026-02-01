import { useContext, useEffect, useRef } from 'react';
import Controls from '../Controls/Controls';
import ProgressBar from '../ProgressBar/ProgressBar';
import Song from '../Song/Song';
import Volume from '../Volume/Volume';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import { Container, ContentContainer, Main, PlayerContainer, StyledPlayer } from './styles';
import { AppContext } from '../../Context/AppContext';
import Sidebar from '../Sidebar/Sidebar';
import AlbumImage from '../AlbumImage/AlbumImage';

const Player = () => {
  const context = useContext(AppContext);
  const {
    metadata,
    progress,
    isPlaying,
    setProgress,
    setCurrentPath,
    currentPath: path,
    playlist,
    setPlaylist,
  } = context;
  const intervalRef = useRef<number | null>(null);

  const handleSeek = async (progressRatio: number) => {
    try {
      await invoke('seek', { percent: progressRatio, path });
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handleOpenFile = async () => {
    const file =
      (await open({
        multiple: true,
        directory: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg'] }],
      })) ?? '';

    console.log('Selected file:', file);
    setCurrentPath?.(file[0]);
    setPlaylist?.([...playlist, ...file]);
  };

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only poll progress if playing
    if (isPlaying) {
      intervalRef.current = window.setInterval(async () => {
        try {
          const currentProgress = await invoke<number>('get_progress');
          const durationSeconds = metadata?.duration?.duration_seconds ?? 0;
          setProgress?.((currentProgress / durationSeconds) * 100);
        } catch (error) {
          console.error('Error getting progress:', error);
        }
      }, 1000); // Update every second
    }

    // Cleanup interval on unmount or when isPlaying changes
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, setProgress]);

  return (
    <Container>
      <ContentContainer>
        <Sidebar />
        <Main>
          <AlbumImage metadata={metadata} onClick={handleOpenFile} />
        </Main>
      </ContentContainer>
      <PlayerContainer>
        <ProgressBar progress={progress} max={100} onSeek={handleSeek} />
        <StyledPlayer>
          <Song
            albumImage={metadata?.image}
            albumName={metadata?.album}
            songName={metadata?.title ?? 'no name'}
            artistName={metadata?.artist ?? 'no name'}
          />
          <Controls />
          <Volume />
        </StyledPlayer>
      </PlayerContainer>
    </Container>
  );
};

export default Player;
