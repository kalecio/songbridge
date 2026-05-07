import { useContext } from 'react';
import { AppContext } from '../Context/AppContext';
import { MetadataType, PlaylistType } from '../types';

export const FAVOURITES_PLAYLIST_ID = 'favourites';
export const FAVOURITES_PLAYLIST_NAME = 'Favourites';

export const isFavouritesPlaylist = (id?: string) => id === FAVOURITES_PLAYLIST_ID;

export const sortFavouritesFirst = (playlists: PlaylistType[]): PlaylistType[] =>
  [...playlists].sort((a, b) => {
    if (a.id === FAVOURITES_PLAYLIST_ID) return -1;
    if (b.id === FAVOURITES_PLAYLIST_ID) return 1;
    return 0;
  });

export const useFavourites = () => {
  const { playlists = [], setPlaylists } = useContext(AppContext);
  const favourites = playlists.find((p) => p.id === FAVOURITES_PLAYLIST_ID);

  const isFavourite = (path?: string) => {
    if (!path || !favourites) return false;
    return favourites.songs.some((s) => s.path === path);
  };

  const toggleFavourite = (song: MetadataType) => {
    if (!song.path || !setPlaylists) return;
    setPlaylists((prev) => {
      const existing = prev.find((p) => p.id === FAVOURITES_PLAYLIST_ID);
      if (!existing) {
        const created: PlaylistType = {
          id: FAVOURITES_PLAYLIST_ID,
          name: FAVOURITES_PLAYLIST_NAME,
          songs: [song],
        };
        return [...prev, created];
      }
      const alreadyFav = existing.songs.some((s) => s.path === song.path);
      const updated: PlaylistType = {
        ...existing,
        songs: alreadyFav ? existing.songs.filter((s) => s.path !== song.path) : [...existing.songs, song],
      };
      return prev.map((p) => (p.id === FAVOURITES_PLAYLIST_ID ? updated : p));
    });
  };

  return { favourites, isFavourite, toggleFavourite };
};
