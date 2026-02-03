import { useContext, useEffect, useRef } from 'react';
import Controls from '../../Components/Controls/Controls';
import ProgressBar from '../../Components/ProgressBar/ProgressBar';
import Song from '../../Components/Song/Song';
import Volume from '../../Components/Volume/Volume';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import { Container, ContentContainer, Main, PlayerContainer, StyledPlayer } from './styles';
import { AppContext } from '../../Context/AppContext';
import Sidebar from '../../Components/Sidebar/Sidebar';
import AlbumImage from '../../Components/AlbumImage/AlbumImage';
import { Route, Routes } from 'react-router';
import Playlist from '../../Components/Playlist/Playlist';

const Player = () => {
  const context = useContext(AppContext);
  const {
    currentPath: path,
    currentPlaylist,
    isPlaying,
    metadata,
    playlists,
    progress,
<<<<<<< HEAD
    onRepeat,
    onShuffle,
=======
>>>>>>> 696e7d1 (refactor: move Player to Pages and create pages)
    setCurrentPath,
    setCurrentPlaylist,
    setProgress,
  } = context;
  const intervalRef = useRef<number | null>(null);
<<<<<<< HEAD
  const endedRef = useRef(false);
=======
>>>>>>> 696e7d1 (refactor: move Player to Pages and create pages)

  const handleSeek = async (progressRatio: number) => {
    try {
      await invoke('seek', { percent: progressRatio, path });
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handleOpenFile = async () => {
    const files = await open({
      multiple: true,
      directory: false,
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg'] }],
    });

    if (!files) {
      return;
    }

    setCurrentPath?.(files[0]);
    const filteredFiles = files.filter((file) => !currentPlaylist.includes(file));
    setCurrentPlaylist?.([...currentPlaylist, ...filteredFiles]);
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
<<<<<<< HEAD

          // Update progress percentage only when we have a valid duration
          if (durationSeconds > 0) {
            setProgress?.((currentProgress / durationSeconds) * 100);

            // If the track reached its end, handle repeat or advance to the next track once
            if (currentProgress >= durationSeconds && !endedRef.current) {
              endedRef.current = true;
              console.log('test', onRepeat);

              // If repeat is enabled, seek back to the start and ensure playback resumes
              if (onRepeat) {
                try {
                  if (path) {
                    await handleSeek(0);
                    await invoke('resume');
                    // Reset ended flag so repeat can trigger again at next end
                    endedRef.current = false;
                  }
                } catch (err) {
                  console.error('Error while repeating track:', err);
                }

                // If shuffle is enabled, pick a random next track
              } else if (onShuffle) {
                try {
                  if (currentPlaylist && currentPlaylist.length > 0) {
                    const randomIndex = Math.floor(Math.random() * currentPlaylist.length);
                    const randomPath = currentPlaylist[randomIndex];
                    setCurrentPath?.(randomPath);
                  }
                } catch (err) {
                  console.error('Error while shuffling track:', err);
                }

                // Otherwise advance to the next track in the playlist
              } else if (currentPlaylist && currentPlaylist.length > 0) {
                const currentIndex = currentPlaylist.indexOf(path ?? '');
                const nextIndex = (currentIndex + 1) % currentPlaylist.length;
                const nextPath = currentPlaylist[nextIndex];
                setCurrentPath?.(nextPath);
              }
            }
          }
=======
          setProgress?.((currentProgress / durationSeconds) * 100);
>>>>>>> 696e7d1 (refactor: move Player to Pages and create pages)
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
<<<<<<< HEAD
  }, [isPlaying, setProgress, currentPlaylist, path, setCurrentPath, metadata, onRepeat, onShuffle]);

  // Reset the ended flag when the current path changes so the next track can be advanced again.
  useEffect(() => {
    endedRef.current = false;
  }, [path]);
=======
  }, [isPlaying, setProgress]);
>>>>>>> 696e7d1 (refactor: move Player to Pages and create pages)

  return (
    <Container>
      <ContentContainer>
        <Sidebar />
        <Main>
          <Routes>
            <Route path="/" element={<AlbumImage metadata={metadata} onClick={handleOpenFile} />} />
            <Route path="/artists" element={<div>Artists View</div>} />
            <Route path="/artists/:id" element={<div>Artist Detail View</div>} />
            <Route path="/albums" element={<div>Albums View</div>} />
            <Route path="/albums/:id" element={<div>Album Detail View</div>} />
            <Route path="/songs" element={<div>Songs View</div>} />
            <Route path="/settings" element={<div>Settings View</div>} />
            <Route path="/playlist/:id" element={<Playlist playlists={playlists} />} />
            <Route path="/playlist" element={<div>Create Playlist View</div>} />
          </Routes>
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
