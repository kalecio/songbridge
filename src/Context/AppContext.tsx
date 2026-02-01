import { createContext } from 'react';
import { MetadataType } from '../types';

interface AppContext {
  currentPath?: string;
  playlist: string[];
  isPlaying: boolean;
  progress: number;
  metadata?: MetadataType;
  showQueue?: boolean;
  setCurrentPath?: (_path?: string) => void;
  setPlaylist?: (_playlist: string[]) => void;
  setIsPlaying?: (_playing: boolean) => void;
  setProgress?: (_progress: number) => void;
  setMetadata?: (_metadata?: MetadataType) => void;
  setShowQueue?: (_showQueue: boolean) => void;
}

export const AppContext = createContext<AppContext>({
  isPlaying: false,
  progress: 0,
  playlist: [],
});
