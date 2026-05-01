import { createContext } from 'react';
import { MetadataType, PlaylistType } from '../types';

interface AppContext {
  currentPath?: string;
  currentPlaylist: string[];
  isPlaying: boolean;
  isScanning: boolean;
  library: MetadataType[];
  libraryPaths: string[];
  metadata?: MetadataType;
  onRepeat: boolean;
  onShuffle: boolean;
  playlists?: PlaylistType[];
  progress: number;
  showQueue?: boolean;
  setCurrentPath?: (_path?: string) => void;
  setCurrentPlaylist?: (_playlist: string[]) => void;
  setIsScanning?: (_isScanning: boolean) => void;
  setLibrary?: (_library: MetadataType[]) => void;
  setLibraryPaths?: (_paths: string[]) => void;
  scanLibrary?: (_paths: string[]) => Promise<void>;
  setPlaylists?: (_playlists: PlaylistType[]) => void;
  setIsPlaying?: (_playing: boolean) => void;
  setProgress?: (_progress: number) => void;
  setMetadata?: (_metadata?: MetadataType) => void;
  setOnRepeat?: (_onRepeat: boolean) => void;
  setOnShuffle?: (_onShuffle: boolean) => void;
  setShowQueue?: (_showQueue: boolean) => void;
}

export const AppContext = createContext<AppContext>({
  onRepeat: false,
  onShuffle: false,
  isPlaying: false,
  isScanning: false,
  library: [],
  libraryPaths: [],
  progress: 0,
  currentPlaylist: [],
});
