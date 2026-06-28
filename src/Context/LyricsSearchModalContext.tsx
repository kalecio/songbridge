import { createContext, useContext, useState, useCallback } from 'react';
import { MetadataType } from '../types';
import { LyricsSearchModal } from '../Components/LyricsSearchModal/LyricsSearchModal';

interface LyricsSearchModalApi {
  open: (_song: MetadataType) => void;
}

const LyricsSearchModalContext = createContext<LyricsSearchModalApi | null>(null);

export const LyricsSearchModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [song, setSong] = useState<MetadataType | null>(null);

  const open = useCallback((s: MetadataType) => {
    setSong(s);
  }, []);

  const close = useCallback(() => {
    setSong(null);
  }, []);

  return (
    <LyricsSearchModalContext.Provider value={{ open }}>
      {children}
      {song && <LyricsSearchModal isOpen onClose={close} song={song} />}
    </LyricsSearchModalContext.Provider>
  );
};

export const useLyricsSearchModal = () => {
  const context = useContext(LyricsSearchModalContext);
  if (!context) {
    throw new Error('useLyricsSearchModal must be used within a LyricsSearchModalProvider');
  }
  return context;
};
