import { FaFileLines } from 'react-icons/fa6';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { ContextMenuItem } from '../Components/ContextMenu/ContextMenu';
import { MetadataType } from '../types';
import { error as logError } from '../logger';

export const useLyricsMenu = () => {
  return (song: MetadataType): ContextMenuItem => ({
    type: 'item',
    label: 'Add lyrics file',
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
        .then((file) => {
          if (!file) return;
          return invoke('import_lrc_file', { songPath, lrcSourcePath: file });
        })
        .catch((err) => logError(`Failed to import LRC file: ${err}`).catch(() => {}));
    },
  });
};
