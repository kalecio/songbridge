import { FaFileLines, FaSearchengin, FaCloudArrowDown } from 'react-icons/fa6';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { ContextMenuItem } from '../Components/ContextMenu/ContextMenu';
import { MetadataType } from '../types';
import { error as logError } from '../logger';
import { useLyricsSearchModal } from '../Context/LyricsSearchModalContext';

export const useLyricsMenu = () => {
  const { open: openLyricsSearch } = useLyricsSearchModal();

  return (song: MetadataType): ContextMenuItem => ({
    type: 'submenu',
    label: 'Lyrics',
    icon: <FaFileLines />,
    disabled: !song.path,
    items: [
      {
        type: 'item',
        label: 'Add local lyrics file',
        icon: <FaFileLines />,
        disabled: !song.path,
        onSelect: () => {
          if (!song.path) return;
          const songPath = song.path;
          open({
            multiple: false,
            directory: false,
            filters: [{ name: 'LRC lyrics', extensions: ['lrc', 'LRC'] }],
          })
            .then((file: string | null) => {
              if (!file) return;
              return invoke('import_lrc_file', { songPath, lrcSourcePath: file });
            })
            .catch((err: Error) => logError(`Failed to import LRC file: ${err}`).catch(() => {}));
        },
      },
      {
        type: 'item',
        label: 'Search & download from lrclib.net',
        icon: <FaCloudArrowDown />,
        disabled: !song.path,
        onSelect: () => openLyricsSearch(song),
      },
      {
        type: 'item',
        label: 'Search by custom query',
        icon: <FaSearchengin />,
        disabled: !song.path,
        onSelect: () => openLyricsSearch(song),
      },
    ],
  });
};
