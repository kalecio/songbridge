import { useCallback, useContext } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../Context/AppContext';
import { MetadataType } from '../types';
import { invalidateCachedArt, updateCachedArt } from './useLazyAlbumArt';

interface EditFields {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  track?: number;
  /** Path to a new cover image on disk. Mutually exclusive with removeCoverArt. */
  coverArtPath?: string;
  /** When true, the existing cover art is stripped from the file. */
  removeCoverArt?: boolean;
  /** Base name (no extension) for renaming the file. Omit to keep existing name. */
  newFilename?: string;
}

export const useMetadataActions = () => {
  const {
    library,
    setLibrary,
    metadata,
    setMetadata,
    playlists,
    setPlaylists,
    currentPath,
    setCurrentPath,
    currentPlaylist,
    setCurrentPlaylist,
  } = useContext(AppContext);

  const updateSongMetadata = useCallback(
    async (path: string, fields: EditFields): Promise<MetadataType> => {
      const result = await invoke<MetadataType>('update_track_metadata', {
        path,
        title: fields.title ?? null,
        artist: fields.artist ?? null,
        album: fields.album ?? null,
        year: fields.year ?? null,
        track: fields.track ?? null,
        coverArtPath: fields.coverArtPath ?? null,
        removeCoverArt: fields.removeCoverArt ?? false,
        newFilename: fields.newFilename ?? null,
      });

      const newPath = result.path ?? path;
      const pathChanged = newPath !== path;

      // ── Image cache ─────────────────────────────────────────────────────────
      const existingImage = library.find((s) => s.path === path)?.image;
      let newLibraryImage: string | undefined;

      if (fields.removeCoverArt) {
        invalidateCachedArt(path);
        if (pathChanged) invalidateCachedArt(newPath);
        newLibraryImage = undefined;
      } else if (result.image) {
        // Seed cache under new path; bust old path entry if the file moved.
        updateCachedArt(newPath, result.image);
        if (pathChanged) invalidateCachedArt(path);
        newLibraryImage = result.image;
      } else {
        // Art unchanged — keep whatever image the library entry already held.
        if (pathChanged) {
          // Move the cache entry to the new path so existing AlbumImage instances
          // still resolve the art correctly after the rename.
          const cached = existingImage ?? null;
          updateCachedArt(newPath, cached);
          invalidateCachedArt(path);
        }
        newLibraryImage = existingImage;
      }

      // ── Library ─────────────────────────────────────────────────────────────
      setLibrary?.(
        library.map((s) => (s.path === path ? { ...s, ...result, path: newPath, image: newLibraryImage } : s)),
      );

      // ── Now-playing metadata ─────────────────────────────────────────────────
      if (metadata?.path === path) {
        let nowPlayingImage = metadata.image;
        if (fields.removeCoverArt) nowPlayingImage = undefined;
        else if (result.image) nowPlayingImage = result.image;

        setMetadata?.({ ...metadata, ...result, path: newPath, image: nowPlayingImage });

        if (pathChanged) setCurrentPath?.(newPath);
      }

      // ── Playback queue ───────────────────────────────────────────────────────
      if (pathChanged) {
        setCurrentPlaylist?.(currentPlaylist.map((p) => (p === path ? newPath : p)));
      }

      // ── Playlists ────────────────────────────────────────────────────────────
      // App.tsx's useEffect will auto-persist any playlist changes to SQLite.
      if (playlists && setPlaylists) {
        setPlaylists((prev) =>
          prev.map((pl) => ({
            ...pl,
            songs: pl.songs.map((s) =>
              s.path === path ? { ...s, path: newPath, title: result.title, artist: result.artist } : s,
            ),
          })),
        );
      }

      return result;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      library,
      setLibrary,
      metadata,
      setMetadata,
      playlists,
      setPlaylists,
      currentPath,
      setCurrentPath,
      currentPlaylist,
      setCurrentPlaylist,
    ],
  );

  return { updateSongMetadata };
};
