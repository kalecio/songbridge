import { useEffect, useState } from 'react';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import './App.css';
import Player from './Pages/Player/Player';
import { AppContext, ScanProgress } from './Context/AppContext';
import { MetadataType, PlaylistType, RepeatMode } from './types';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { themes, defaultTheme } from './theme';
import { ShortcutBindings, loadShortcuts, saveShortcuts } from './keyboard';
import { ModalProvider } from './Context/ModalContext';

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
  const [onRepeat, setOnRepeat] = useState<RepeatMode>('none');
  const [onShuffle, setOnShuffle] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [metadata, setMetadata] = useState<MetadataType | undefined>(undefined);
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [library, setLibrary] = useState<MetadataType[]>([]);
  const [libraryPaths, setLibraryPaths] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({ current: 0, total: 0 });
  const [currentTheme, setCurrentTheme] = useState<string>(defaultTheme.name);
  const [shortcuts, setShortcutsState] = useState<ShortcutBindings>(() => loadShortcuts());

  const setShortcuts = (next: ShortcutBindings) => {
    setShortcutsState(next);
    saveShortcuts(next);
  };

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

  // Suppress the native right-click menu in production builds so only our
  // custom ContextMenu shows. Allow it on text inputs/textareas so copy/paste
  // stays accessible. In dev we keep it for "Inspect Element".
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const block = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, []);

  // Load persisted state from SQLite on mount, then scan with configured paths
  useEffect(() => {
    const load = async () => {
      try {
        const prefs = await invoke<{
          current_path?: string;
          current_playlist: string[];
          on_repeat: RepeatMode;
          on_shuffle: boolean;
          theme: string;
        }>('db_get_preferences');
        if (prefs.current_playlist.length) setCurrentPlaylist(prefs.current_playlist);
        setOnRepeat(prefs.on_repeat as RepeatMode);
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

        // Hydrate the UI from cached metadata first, so the app is responsive
        // immediately on launch. Then sync with disk in the background.
        try {
          const cached = await invoke<MetadataType[]>('db_load_tracks');
          if (cached.length) setLibrary(cached);
        } catch {
          // No cache available — fall through to a fresh scan.
        }
        scanLibrary(paths);
      } catch {
        // DB not available — start fresh
        scanLibrary([]);
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

  // Push track metadata (title/artist/album/cover/duration) to the OS
  // now-playing surface — Control Center on macOS, MPRIS on Linux, SMTC on
  // Windows. Only re-fires when the track itself changes so we don't
  // re-encode the cover art on every progress tick.
  useEffect(() => {
    invoke('set_now_playing', {
      payload: {
        title: metadata?.title ?? null,
        artist: metadata?.artist ?? null,
        album: metadata?.album ?? null,
        duration_seconds: metadata?.duration?.duration_seconds ?? null,
        cover_data_url: metadata?.image ?? null,
      },
    }).catch(() => {});
  }, [metadata]);

  // Push playback state + elapsed position whenever they change. Cheap call
  // (no cover encoding) so it's safe to fire on every 1s `progress` update —
  // this is what makes the OS scrubber slide as the song plays and stay put
  // when paused.
  useEffect(() => {
    const total = metadata?.duration?.duration_seconds ?? 0;
    const elapsed = total > 0 ? (progress / 100) * total : null;
    invoke('set_playback_state', {
      payload: {
        is_playing: isPlaying,
        elapsed_seconds: elapsed,
      },
    }).catch(() => {});
  }, [isPlaying, progress, metadata]);

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
        shortcuts,
        setShortcuts,
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
        <ModalProvider>
          <Player />
        </ModalProvider>
      </ThemeProvider>
    </AppContext.Provider>
  );
}

export default App;
