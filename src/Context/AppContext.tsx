import { createContext } from 'react';
import { MetadataType, PlaylistType } from '../types';

interface AppContext {
  currentPath?: string;
  currentPlaylist: string[];
  playlists?: PlaylistType[];
  isPlaying: boolean;
  progress: number;
  metadata?: MetadataType;
  showQueue?: boolean;
  setCurrentPath?: (_path?: string) => void;
  setCurrentPlaylist?: (_playlist: string[]) => void;
  setPlaylists?: (_playlists: PlaylistType[]) => void;
  setIsPlaying?: (_playing: boolean) => void;
  setProgress?: (_progress: number) => void;
  setMetadata?: (_metadata?: MetadataType) => void;
  setShowQueue?: (_showQueue: boolean) => void;
}

export const AppContext = createContext<AppContext>({
  isPlaying: false,
  progress: 0,
  currentPlaylist: [],
});
