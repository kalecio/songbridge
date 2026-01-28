import { useContext, useEffect, useRef } from 'react';
import Controls from '../Controls/Controls';
import ProgressBar from '../ProgressBar/ProgressBar';
import Song from '../Song/Song';
import Volume from '../Volume/Volume';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import { PlayerContainer, StyledPlayer } from './styles';
import { AppContext } from '../../Context/AppContext';
import { styled } from 'styled-components';
import { AlbumImage, AlbumImagePlaceholder, AlbumImagePlaceholderContainer } from '../Song/styles';

const Player = () => {
  const context = useContext(AppContext);
  const { metadata, progress, isPlaying, setProgress, setCurrentPath, currentPath: path } = context;
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
        multiple: false,
        directory: false,
      })) ?? '';
    setCurrentPath?.(file);
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
      <Main>
        {metadata?.image ? (
          <PlayerAlbumArt src={metadata?.image} alt={metadata?.album} onClick={handleOpenFile} />
        ) : (
          <AlbumImagePlaceholderContainer onClick={handleOpenFile}>
            <PlayerAlbumArtPlaceholder />
          </AlbumImagePlaceholderContainer>
        )}
      </Main>
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

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
`;

const Main = styled.div`
  background-color: #ffe1e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const PlayerAlbumArt = styled(AlbumImage)`
  width: 25rem;
  height: 25rem;
`;

const PlayerAlbumArtPlaceholder = styled(AlbumImagePlaceholder)`
  width: 25rem;
  height: 25rem;
`;

export default Player;
