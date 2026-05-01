import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppContext } from '../Context/AppContext';

type AppContextValue = React.ComponentProps<typeof AppContext.Provider>['value'];

const defaultContext: AppContextValue = {
  onRepeat: false,
  onShuffle: false,
  isPlaying: false,
  isScanning: false,
  library: [],
  progress: 0,
  currentPlaylist: [],
};

export const renderWithContext = (
  ui: React.ReactElement,
  contextOverrides?: Partial<AppContextValue>,
  options?: RenderOptions,
) =>
  render(
    <MemoryRouter>
      <AppContext.Provider value={{ ...defaultContext, ...contextOverrides }}>{ui}</AppContext.Provider>
    </MemoryRouter>,
    options,
  );
