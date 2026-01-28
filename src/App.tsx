import { useState } from 'react';
import './App.css';
import Player from './Components/Player/Player';
import { AppContext } from './Context/AppContext';
import { MetadataType } from './types';

function App() {
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [metadata, setMetadata] = useState<MetadataType | undefined>(undefined);

  return (
    <AppContext.Provider
      value={{
        currentPath,
        isPlaying,
        progress,
        metadata,
        setCurrentPath,
        setIsPlaying,
        setProgress,
        setMetadata,
      }}
    >
      <Player />
    </AppContext.Provider>
  );
}

export default App;
