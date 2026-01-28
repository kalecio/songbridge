import { useEffect, useState } from 'react';
import './App.css';
import Player from './Pages/Player/Player';
import { AppContext } from './Context/AppContext';
import { MetadataType, PlaylistType } from './types';
import { invoke } from '@tauri-apps/api/core';

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

  const scanLibrary = async (paths: string[]) => {
    setIsScanning(true);
    try {
      const songs = await invoke<MetadataType[]>('scan_music_library', { paths });
      setLibrary(songs);
    } catch {
      // music directory not found or empty — silently ignore
    } finally {
      setIsScanning(false);
    }
  };

  // Load persisted state from SQLite on mount, then scan with configured paths
  useEffect(() => {
    const load = async () => {
      try {
        const prefs = await invoke<{
          current_path?: string;
          current_playlist: string[];
          on_repeat: boolean;
          on_shuffle: boolean;
        }>('db_get_preferences');
        if (prefs.current_path) setCurrentPath(prefs.current_path);
        if (prefs.current_playlist.length) setCurrentPlaylist(prefs.current_playlist);
        setOnRepeat(prefs.on_repeat);
        setOnShuffle(prefs.on_shuffle);

        const dbPlaylists = await invoke<{ id: string; name: string; song_paths: string[] }[]>('db_get_playlists');
        setPlaylists(
          dbPlaylists.map((p) => ({
            id: p.id,
            name: p.name,
            songs: p.song_paths.map((path) => ({ path })),
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
    }).catch(() => {});
  }, [currentPath, currentPlaylist, onRepeat, onShuffle]);

  // Persist playlists whenever they change
  useEffect(() => {
    playlists.forEach((pl) => {
      invoke('db_upsert_playlist', {
        id: pl.id,
        name: pl.name,
        songPaths: pl.songs.map((s) => s.path).filter(Boolean),
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
        onRepeat,
        onShuffle,
        showQueue,
        library,
        libraryPaths,
        isScanning,
        setCurrentPath,
        setCurrentPlaylist,
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
      <Player />
    </AppContext.Provider>
  );
}

export default App;
