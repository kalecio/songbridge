import { useContext } from 'react';
import { useNavigate } from 'react-router';
import { FaListUl, FaPlus } from 'react-icons/fa6';
import { AppContext } from '../Context/AppContext';
import { ContextMenuItem } from '../Components/ContextMenu/ContextMenu';
import { MetadataType } from '../types';
import { usePlayHistory } from './usePlayHistory';
import { usePlaylistActions } from './usePlaylistActions';

/**
 * Returns a builder that produces an "Add to playlist →" submenu item for a
 * given song. The submenu lists "Create new playlist" first, then up to five
 * most-recently-played playlists. Entries whose playlist already contains
 * the song are disabled.
 */
export const useAddToPlaylistMenu = () => {
  const { playlists = [] } = useContext(AppContext);
  const { addSongToPlaylist } = usePlaylistActions();
  const { recentPlaylistIds } = usePlayHistory();
  const navigate = useNavigate();

  return (song: MetadataType): ContextMenuItem => {
    const recent = recentPlaylistIds
      .map((id) => playlists.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    // Fallback when nothing has been played yet: surface the 5 most recently
    // created playlists. DB query is `ORDER BY rowid` and new playlists are
    // always appended, so array order is creation order (oldest first).
    const shown = recent.length > 0 ? recent : [...playlists].slice(-5).reverse();

    const recentItems: ContextMenuItem[] = shown.map((pl) => ({
      type: 'item',
      label: pl.name,
      icon: <FaListUl />,
      disabled: Boolean(song.path) && pl.songs.some((s) => s.path === song.path),
      onSelect: () => addSongToPlaylist(pl, song),
    }));

    const items: ContextMenuItem[] = [
      {
        type: 'item',
        label: 'Create new playlist',
        icon: <FaPlus />,
        onSelect: () => navigate('/playlist', { state: { addSong: song } }),
      },
      ...(recentItems.length > 0 ? ([{ type: 'divider' }] as ContextMenuItem[]) : []),
      ...recentItems,
    ];

    return {
      type: 'submenu',
      label: 'Add to playlist',
      icon: <FaListUl />,
      items,
      disabled: !song.path,
    };
  };
};
