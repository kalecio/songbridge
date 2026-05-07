import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, Route, Routes } from 'react-router';
import { error as logError } from '../../logger';
import { FaGear } from 'react-icons/fa6';
import Controls from '../../Components/Controls/Controls';
import ProgressBar from '../../Components/ProgressBar/ProgressBar';
import Song from '../../Components/Song/Song';
import Volume from '../../Components/Volume/Volume';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import {
  AppHeader,
  Container,
  ContentContainer,
  HomeCenter,
  Main,
  MainWrapper,
  PlayerContainer,
  SearchIcon,
  SearchInput,
  SearchWrapper,
  SettingsButton,
  StyledPlayer,
} from './styles';
import { AppContext } from '../../Context/AppContext';
import Sidebar from '../../Components/Sidebar/Sidebar';
import AlbumImage from '../../Components/AlbumImage/AlbumImage';
import PlaylistRoute from '../Playlist/Detail';
import Songs from '../Songs/List';
import Albums from '../Albuns/List';
import AlbumDetail from '../Albuns/Detail';
import Artists from '../Artists/List';
import ArtistDetail from '../Artists/Detail';
import Settings from '../Settings/Settings';
import Search from '../Search/Search';
import CreatePlaylist from '../Playlist/Create';

const Player = () => {
  const navigate = useNavigate();
  const context = useContext(AppContext);
  const {
    currentPath: path,
    currentPlaylist,
    isPlaying,
    metadata,
    playlists,
    progress,
    onRepeat,
    onShuffle,
    setCurrentPath,
    setCurrentPlaylist,
    setProgress,
  } = context;
  const intervalRef = useRef<number | null>(null);
  const endedRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debounceTimeoutRef = useRef<number | null>(null);

  const handleSeek = useCallback(
    async (progressRatio: number) => {
      try {
        await invoke('seek', { percent: progressRatio, path });
      } catch (error) {
        logError(`Seek failed: ${error}`).catch(() => {});
      }
    },
    [path],
  );

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
    // Filter out files already in the current playlist
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

          // Update progress percentage only when we have a valid duration
          if (durationSeconds > 0) {
            setProgress?.((currentProgress / durationSeconds) * 100);

            // If the track reached its end, handle repeat or advance to the next track once
            if (currentProgress >= durationSeconds && !endedRef.current) {
              endedRef.current = true;

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
                  logError(`Repeat failed: ${err}`).catch(() => {});
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
                  logError(`Shuffle failed: ${err}`).catch(() => {});
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
        } catch (error) {
          logError(`Progress poll failed: ${error}`).catch(() => {});
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
  }, [isPlaying, setProgress, currentPlaylist, path, setCurrentPath, metadata, onRepeat, onShuffle, handleSeek]);

  // Reset the ended flag when the current path changes so the next track can be advanced again.
  useEffect(() => {
    endedRef.current = false;
  }, [path]);

  // --- DEBOUNCE LOGIC START ---

  const performSearch = useCallback(
    (value: string) => {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    },
    [navigate],
  );

  // Debounce hook: executes performSearch only 300ms after 'searchTerm' stops changing.
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      performSearch(trimmed);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm, performSearch]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSearchTerm(newValue);
  }, []);

  // --- DEBOUNCE LOGIC END ---

  return (
    <Container>
      <ContentContainer>
        <Sidebar />
        <MainWrapper>
          <AppHeader>
            <SearchWrapper>
              <SearchIcon />
              <SearchInput
                placeholder="Search songs, artists, albums…"
                value={searchTerm}
                onChange={handleInputChange}
                aria-label="Search library"
              />
            </SearchWrapper>
            <SettingsButton aria-label="Settings" onClick={() => navigate('/settings')}>
              <FaGear />
            </SettingsButton>
          </AppHeader>
          <Main>
            <Routes>
              <Route
                path="/"
                element={
                  <HomeCenter>
                    <AlbumImage metadata={metadata} onClick={handleOpenFile} />
                  </HomeCenter>
                }
              />
              <Route path="/artists" element={<Artists />} />
              <Route path="/artists/:id" element={<ArtistDetail />} />
              <Route path="/albums" element={<Albums />} />
              <Route path="/albums/:id" element={<AlbumDetail />} />
              <Route path="/songs" element={<Songs />} />
              <Route path="/search" element={<Search />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/playlist/:id" element={<PlaylistRoute playlists={playlists} />} />
              <Route path="/playlist" element={<CreatePlaylist />} />
              {/* CATCH-ALL ROUTE FOR 404 HANDLING */}
              <Route path="*" element={<div>404 - Page Not Found</div>} />
            </Routes>
          </Main>
        </MainWrapper>
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
