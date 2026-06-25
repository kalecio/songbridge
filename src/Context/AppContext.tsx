import React, { createContext } from 'react';
import { MetadataType, PlaylistType, RepeatMode } from '../types';
import { DEFAULT_SHORTCUTS, ShortcutBindings } from '../keyboard';

export interface ScanProgress {
  current: number;
  total: number;
}

interface AppContext {
  currentPath?: string;
  currentPlaylist: string[];
  currentTheme: string;
  isPlaying: boolean;
  isScanning: boolean;
  scanProgress: ScanProgress;
  shortcuts: ShortcutBindings;
  library: MetadataType[];
  libraryPaths: string[];
  metadata?: MetadataType;
  onRepeat: RepeatMode;
  onShuffle: boolean;
  playlists?: PlaylistType[];
  progress: number;
  showQueue?: boolean;
  setCurrentPath?: (_path?: string) => void;
  setCurrentPlaylist?: (_playlist: string[]) => void;
  setCurrentTheme?: (_theme: string) => void;
  setIsScanning?: (_isScanning: boolean) => void;
  setShortcuts?: (_shortcuts: ShortcutBindings) => void;
  setLibrary?: (_library: MetadataType[]) => void;
  setLibraryPaths?: (_paths: string[]) => void;
  scanLibrary?: (_paths: string[]) => Promise<void>;
  setPlaylists?: React.Dispatch<React.SetStateAction<PlaylistType[]>>;
  setIsPlaying?: (_playing: boolean) => void;
  setProgress?: (_progress: number) => void;
  setMetadata?: (_metadata?: MetadataType) => void;
  setOnRepeat?: (_onRepeat: RepeatMode) => void;
  setOnShuffle?: (_onShuffle: boolean) => void;
  setShowQueue?: (_showQueue: boolean) => void;
}

export const AppContext = createContext<AppContext>({
  onRepeat: 'none',
  onShuffle: false,
  isPlaying: false,
  isScanning: false,
  scanProgress: { current: 0, total: 0 },
  shortcuts: DEFAULT_SHORTCUTS,
  library: [],
  libraryPaths: [],
  progress: 0,
  currentPlaylist: [],
  currentTheme: 'Midnight',
});
