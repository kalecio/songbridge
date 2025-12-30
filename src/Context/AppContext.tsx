import { createContext } from 'react';
import { MetadataType } from '../types';

interface AppContext {
  currentPath?: string;
  isPlaying?: boolean;
  progress?: number;
  metadata?: MetadataType;
  setCurrentPath?: (path?: string) => void;
  setIsPlaying?: (playing: boolean) => void;
  setProgress?: (progress: number) => void;
  setMetadata?: (metadata?: MetadataType) => void;
}

export const AppContext = createContext<AppContext>({
  isPlaying: false,
});
