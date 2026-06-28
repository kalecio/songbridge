import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Route, Routes } from 'react-router';
import { error as logError } from '../../logger';
import Controls from '../../Components/Controls/Controls';
import ProgressBar from '../../Components/ProgressBar/ProgressBar';
import Song from '../../Components/Song/Song';
import { splitArtists } from '../../utils/artistUtils';
import Volume from '../../Components/Volume/Volume';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import {
  AppHeader,
  Container,
  ContentContainer,
  ControlsWrapper,
  HomeCenter,
  Main,
  MainWrapper,
  PlayerContainer,
  ScanBanner,
  ScanBannerLabel,
  SearchIcon,
  SearchInput,
  SearchWrapper,
  SettingsButton,
  StyledPlayer,
} from './styles';
import { AppContext } from '../../Context/AppContext';
import { AUDIO_EVENTS, emitAudioEvent } from '../../audioEvents';
import { displayTitle } from '../../songDisplay';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useMediaKeys } from '../../hooks/useMediaKeys';
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
import Lyrics from '../Lyrics/Lyrics';
import CreatePlaylist from '../Playlist/Create';

const Player = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const context = useContext(AppContext);
  const {
    currentPath: path,
    currentPlaylist,
    isPlaying,
    isScanning,
    scanProgress,
    shortcuts,
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
  const animationFrameRef = useRef<number | null>(null);
  const endedRef = useRef(false);
  // Interpolation state
  const lastPolledProgressRef = useRef<number>(0); // 0-1
  const lastPolledTimeRef = useRef<number>(0); // timestamp
  const localProgressRef = useRef<number>(0); // 0-1 interpolated
  const [searchTerm, setSearchTerm] = useState('');
  const debounceTimeoutRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSeek = useCallback(
    async (progressRatio: number) => {
      try {
        await invoke('seek', { percent: progressRatio, path });
        // Reset interpolation state after seek
        lastPolledProgressRef.current = progressRatio;
        lastPolledTimeRef.current = performance.now();
        localProgressRef.current = progressRatio;
        setProgress?.(progressRatio * 100);
      } catch (error) {
        logError(`Seek failed: ${error}`).catch(() => {});
      }
    },
    [path, setProgress],
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

  useKeyboardShortcuts(
    {
      playPause: () => emitAudioEvent(AUDIO_EVENTS.playPause),
      next: () => emitAudioEvent(AUDIO_EVENTS.next),
      previous: () => emitAudioEvent(AUDIO_EVENTS.previous),
      shuffle: () => emitAudioEvent(AUDIO_EVENTS.shuffle),
      repeat: () => emitAudioEvent(AUDIO_EVENTS.repeat),
      mute: () => emitAudioEvent(AUDIO_EVENTS.mute),
      openFiles: () => {
        handleOpenFile();
      },
      search: () => searchInputRef.current?.focus(),
    },
    shortcuts,
  );

  useMediaKeys((seconds) => {
    const total = metadata?.duration?.duration_seconds ?? 0;
    if (total <= 0) return;
    const ratio = Math.max(0, Math.min(1, seconds / total));
    handleSeek(ratio);
  });

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Interpolation loop - runs at 60fps for smooth progress bar
    const animate = () => {
      const now = performance.now();
      const durationSeconds = metadata?.duration?.duration_seconds ?? 0;

      if (durationSeconds > 0 && isPlaying) {
        const elapsedSincePoll = (now - lastPolledTimeRef.current) / 1000; // seconds
        // Interpolate: last known progress + elapsed time since poll
        let interpolated = lastPolledProgressRef.current + elapsedSincePoll / durationSeconds;
        // Clamp to [0, 1]
        interpolated = Math.max(0, Math.min(1, interpolated));
        localProgressRef.current = interpolated;
        setProgress?.(interpolated * 100);

        // Check for track end using interpolated progress
        if (interpolated >= 1 && !endedRef.current) {
          endedRef.current = true;
          handleTrackEnd();
        }
      }
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    // Backend polling - runs every 1s to sync with actual playback position
    const pollBackend = async () => {
      try {
        const currentProgress = await invoke<number>('get_progress');
        const durationSeconds = metadata?.duration?.duration_seconds ?? 0;

        if (durationSeconds > 0) {
          const progressRatio = currentProgress / durationSeconds;
          lastPolledProgressRef.current = progressRatio;
          lastPolledTimeRef.current = performance.now();

          // If track ended, handle repeat/advance
          if (currentProgress >= durationSeconds && !endedRef.current) {
            endedRef.current = true;
            handleTrackEnd();
          }
        }
      } catch (error) {
        logError(`Progress poll failed: ${error}`).catch(() => {});
      }
    };

    const handleTrackEnd = async () => {
      if (onRepeat === 'one') {
        try {
          if (path) {
            await handleSeek(0);
            await invoke('resume');
            await new Promise((resolve) => setTimeout(resolve, 200));
            const verifyProgress = await invoke<number>('get_progress');
            const durationSeconds = metadata?.duration?.duration_seconds ?? 0;
            if (verifyProgress < durationSeconds * 0.1) {
              endedRef.current = false;
              lastPolledProgressRef.current = 0;
              lastPolledTimeRef.current = performance.now();
              localProgressRef.current = 0;
              setProgress?.(0);
            }
          }
        } catch (err) {
          logError(`Repeat failed: ${err}`).catch(() => {});
        }
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
      } else if (currentPlaylist && currentPlaylist.length > 0) {
        const currentIndex = currentPlaylist.indexOf(path ?? '');
        if (currentIndex !== -1 && currentIndex < currentPlaylist.length - 1) {
          const nextPath = currentPlaylist[currentIndex + 1];
          setCurrentPath?.(nextPath);
        } else if (onRepeat === 'all') {
          setCurrentPath?.(currentPlaylist[0]);
        }
      }
    };

    if (isPlaying) {
      // Initialize interpolation state
      lastPolledTimeRef.current = performance.now();
      animate();
      intervalRef.current = window.setInterval(pollBackend, 1000);
    }

    // Cleanup
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, setProgress, currentPlaylist, path, setCurrentPath, metadata, onRepeat, onShuffle, handleSeek]);

  // Reset the ended flag and interpolation state when the current path changes so the next track can be advanced again.
  useEffect(() => {
    endedRef.current = false;
    lastPolledProgressRef.current = 0;
    lastPolledTimeRef.current = performance.now();
    localProgressRef.current = 0;
    setProgress?.(0);
  }, [path, setProgress]);

  // Sync the search input to the URL: shows the active query when on /search,
  // clears the input when the user navigates anywhere else, and cancels any
  // pending debounce so we don't snap them back to /search after they leave.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('q') ?? '');
    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, [location.pathname, location.search]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setSearchTerm(newValue);

      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
      const trimmed = newValue.trim();
      if (!trimmed) return;
      debounceTimeoutRef.current = window.setTimeout(() => {
        navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      }, 300);
    },
    [navigate],
  );

  return (
    <Container>
      <ContentContainer>
        <Sidebar />
        <MainWrapper>
          <AppHeader>
            <SearchWrapper>
              <SearchIcon />
              <SearchInput
                ref={searchInputRef}
                placeholder="Search songs, artists, albums…"
                value={searchTerm}
                onChange={handleInputChange}
                aria-label="Search library"
              />
            </SearchWrapper>
            <SettingsButton aria-label="Settings" onClick={() => navigate('/settings')} />
          </AppHeader>
          {isScanning && (
            <ScanBanner role="status" aria-live="polite">
              <ScanBannerLabel>
                <span>Scanning library…</span>
                <span>
                  {scanProgress.total > 0 ? `${scanProgress.current} / ${scanProgress.total}` : 'Counting tracks…'}
                </span>
              </ScanBannerLabel>
              <ProgressBar
                progress={scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}
                max={100}
              />
            </ScanBanner>
          )}
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
              <Route path="/lyrics" element={<Lyrics />} />
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
            songName={displayTitle({ title: metadata?.title, path: path }, 'no name')}
            artistName={splitArtists(metadata?.artist ?? '')[0] ?? 'no name'}
          />
          <ControlsWrapper>
            <Controls />
          </ControlsWrapper>
          <Volume />
        </StyledPlayer>
      </PlayerContainer>
    </Container>
  );
};

export default Player;
