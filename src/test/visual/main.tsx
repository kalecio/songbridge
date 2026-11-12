import ReactDOM from 'react-dom/client';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import Player from '../../Pages/Player/Player';
import { AppContext } from '../../Context/AppContext';
import { ModalProvider } from '../../Context/ModalContext';
import { LyricsSearchModalProvider } from '../../Context/LyricsSearchModalContext';
import { midnightTheme } from '../../theme';
import { DEFAULT_SHORTCUTS } from '../../keyboard';
import { MetadataType, PlaylistType } from '../../types';
import '../../App.css';

import { library } from './data';
const PreviewStyle = createGlobalStyle`body { color: ${({ theme }) => theme.textPrimary}; background: ${({ theme }) => theme.background}; }`;
function Preview() {
  const [currentPath, setCurrentPath] = useState<string | undefined>(library[0].path);
  const [metadata, setMetadata] = useState<MetadataType | undefined>(library[0]);
  const [playlists, setPlaylists] = useState<PlaylistType[]>([
    { id: 'favourites', name: 'Favourites', songs: [] },
    { id: 'evening', name: 'Fim de tarde', songs: library },
  ]);
  const [showQueue, setShowQueue] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  return (
    <ThemeProvider theme={midnightTheme}>
      <PreviewStyle />
      <MemoryRouter>
        <AppContext.Provider
          value={{
            library,
            playlists,
            setPlaylists,
            currentPath,
            setCurrentPath,
            metadata,
            setMetadata,
            currentPlaylist,
            setCurrentPlaylist,
            showQueue,
            setShowQueue,
            isPlaying,
            setIsPlaying,
            progress: 37.84,
            isScanning: false,
            scanProgress: { current: 0, total: 0 },
            libraryPaths: [],
            onRepeat: 'none',
            onShuffle: false,
            currentTheme: 'Midnight',
            shortcuts: DEFAULT_SHORTCUTS,
          }}
        >
          <ModalProvider>
            <LyricsSearchModalProvider>
              <Player />
            </LyricsSearchModalProvider>
          </ModalProvider>
        </AppContext.Provider>
      </MemoryRouter>
    </ThemeProvider>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(<Preview />);
