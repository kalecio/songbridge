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
  const endedRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debounceTimeoutRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

              if (onRepeat === 'one') {
                try {
                  if (path) {
                    await handleSeek(0);
                    await invoke('resume');
                    // Wait for seek to actually take effect before clearing ended flag.
                    // The progress poll may still return the old position for a short time.
                    await new Promise((resolve) => setTimeout(resolve, 200));
                    // Verify position actually reset by checking progress again
                    const verifyProgress = await invoke<number>('get_progress');
                    if (verifyProgress < durationSeconds * 0.1) {
                      endedRef.current = false;
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
          <Controls />
          <Volume />
        </StyledPlayer>
      </PlayerContainer>
    </Container>
  );
};

export default Player;
