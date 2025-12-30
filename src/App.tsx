import { useState } from 'react';
import { styled } from 'styled-components';
import './App.css';
import Player from './Components/Player/Player';
import { AppContext } from './Context/AppContext';
import { MetadataType } from './types';

function App() {
  const [currentPath, setCurrentPath] = useState<string | undefined>('music-files/Polygondwanaland.mp3');
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
      <Container>
        <Main>app</Main>
        <Player />
      </Container>
    </AppContext.Provider>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
`;

const Main = styled.div`
  background-color: #ffe1e0;
`;

export default App;
