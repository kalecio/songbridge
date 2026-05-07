import { useEffect, useState } from 'react';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import './App.css';
import Player from './Pages/Player/Player';
import { AppContext, ScanProgress } from './Context/AppContext';
import { MetadataType, PlaylistType } from './types';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { themes, defaultTheme } from './theme';

const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${({ theme }) => theme.background};
    color: ${({ theme }) => theme.textPrimary};
  }
`;

function App() {
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined);
  const [currentPlaylist, setCurrentPlaylist] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Array<PlaylistType>>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [onRepeat, setOnRepeat] = useState<boolean>(false);
  const [onShuffle, setOnShuffle] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [metadata, setMetadata] = useState<MetadataType | undefined>(undefined);
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [library, setLibrary] = useState<MetadataType[]>([]);
  const [libraryPaths, setLibraryPaths] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({ current: 0, total: 0 });
  const [currentTheme, setCurrentTheme] = useState<string>(defaultTheme.name);

  const activeTheme = themes[currentTheme] ?? defaultTheme;

  const scanLibrary = async (paths: string[]) => {
    setIsScanning(true);
    setScanProgress({ current: 0, total: 0 });
    try {
      const songs = await invoke<MetadataType[]>('scan_music_library', { paths });
      setLibrary(songs);
    } catch {
      // music directory not found or empty — silently ignore
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const unlistenPromise = listen<ScanProgress>('scan-progress', (event) => {
      setScanProgress(event.payload);
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, []);

  // Load persisted state from SQLite on mount, then scan with configured paths
  useEffect(() => {
    const load = async () => {
      try {
        const prefs = await invoke<{
          current_path?: string;
          current_playlist: string[];
          on_repeat: boolean;
          on_shuffle: boolean;
          theme: string;
        }>('db_get_preferences');
        if (prefs.current_playlist.length) setCurrentPlaylist(prefs.current_playlist);
        setOnRepeat(prefs.on_repeat);
        setOnShuffle(prefs.on_shuffle);
        if (themes[prefs.theme]) setCurrentTheme(prefs.theme);

        const dbPlaylists =
          await invoke<{ id: string; name: string; songs: { path: string; title?: string; artist?: string }[] }[]>(
            'db_get_playlists',
          );
        setPlaylists(
          dbPlaylists.map((p) => ({
            id: p.id,
            name: p.name,
            songs: p.songs.map((s) => ({ path: s.path, title: s.title, artist: s.artist })),
          })),
        );

        const paths = await invoke<string[]>('db_get_library_paths');
        setLibraryPaths(paths);
        await scanLibrary(paths);
      } catch {
        // DB not available — start fresh
        await scanLibrary([]);
      }
    };
    load();
  }, []);

  // Persist preferences whenever they change
  useEffect(() => {
    invoke('db_save_preferences', {
      currentPath: currentPath ?? null,
      currentPlaylist,
      onRepeat,
      onShuffle,
      theme: currentTheme,
    }).catch(() => {});
  }, [currentPath, currentPlaylist, onRepeat, onShuffle, currentTheme]);

  // Persist playlists whenever they change
  useEffect(() => {
    playlists.forEach((pl) => {
      invoke('db_upsert_playlist', {
        id: pl.id,
        name: pl.name,
        songs: pl.songs
          .filter((s) => Boolean(s.path))
          .map((s) => ({ path: s.path, title: s.title ?? null, artist: s.artist ?? null })),
      }).catch(() => {});
    });
  }, [playlists]);

  return (
    <AppContext.Provider
      value={{
        currentPath,
        isPlaying,
        progress,
        metadata,
        playlists,
        currentPlaylist,
        currentTheme,
        onRepeat,
        onShuffle,
        showQueue,
        library,
        libraryPaths,
        isScanning,
        scanProgress,
        setCurrentPath,
        setCurrentPlaylist,
        setCurrentTheme,
        setLibrary,
        setLibraryPaths,
        scanLibrary,
        setIsScanning,
        setPlaylists,
        setIsPlaying,
        setOnRepeat,
        setOnShuffle,
        setProgress,
        setMetadata,
        setShowQueue,
      }}
    >
      <ThemeProvider theme={activeTheme}>
        <GlobalStyle />
        <Player />
      </ThemeProvider>
    </AppContext.Provider>
  );
}

export default App;
