import { createContext } from 'react';
import { MetadataType } from '../types';

interface AppContext {
  currentPath?: string;
  isPlaying?: boolean;
  progress?: number;
  metadata?: MetadataType;
  setCurrentPath?: (_path?: string) => void;
  setIsPlaying?: (_playing: boolean) => void;
  setProgress?: (_progress: number) => void;
  setMetadata?: (_metadata?: MetadataType) => void;
}

export const AppContext = createContext<AppContext>({
  isPlaying: false,
});
