import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from 'styled-components';
import { AppContext } from '../Context/AppContext';
import { DEFAULT_SHORTCUTS } from '../keyboard';
import { LyricsSearchModalProvider } from '../Context/LyricsSearchModalContext';
import { defaultTheme } from '../theme';

type AppContextValue = React.ComponentProps<typeof AppContext.Provider>['value'];

const defaultContext: AppContextValue = {
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
};

export const renderWithContext = (
  ui: React.ReactElement,
  contextOverrides?: Partial<AppContextValue>,
  options?: RenderOptions,
) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={defaultTheme}>
        <LyricsSearchModalProvider>
          <AppContext.Provider value={{ ...defaultContext, ...contextOverrides }}>{ui}</AppContext.Provider>
        </LyricsSearchModalProvider>
      </ThemeProvider>
    </MemoryRouter>,
    options,
  );
