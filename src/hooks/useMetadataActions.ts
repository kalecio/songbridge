import { useCallback, useContext } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../Context/AppContext';
import { MetadataType } from '../types';
import { invalidateCachedArt, updateCachedArt } from './useLazyAlbumArt';

export interface EditFields {
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

interface SongUpdate {
  oldPath: string;
  newPath: string;
  pathChanged: boolean;
  result: MetadataType;
  newLibraryImage: string | undefined;
}

function buildInvokeArgs(path: string, fields: EditFields) {
  return {
    path,
    title: fields.title ?? null,
    artist: fields.artist ?? null,
    album: fields.album ?? null,
    year: fields.year ?? null,
    track: fields.track ?? null,
    coverArtPath: fields.coverArtPath ?? null,
    removeCoverArt: fields.removeCoverArt ?? false,
    newFilename: fields.newFilename ?? null,
  };
}

function resolveImageUpdate(
  fields: EditFields,
  result: MetadataType,
  oldPath: string,
  newPath: string,
  pathChanged: boolean,
  existingImage: string | undefined,
): string | undefined {
  if (fields.removeCoverArt) {
    invalidateCachedArt(oldPath);
    if (pathChanged) invalidateCachedArt(newPath);
    return undefined;
  }
  if (result.image) {
    updateCachedArt(newPath, result.image);
    if (pathChanged) invalidateCachedArt(oldPath);
    return result.image;
  }
  if (pathChanged) {
    updateCachedArt(newPath, existingImage ?? null);
    invalidateCachedArt(oldPath);
  }
  return existingImage;
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
      const result = await invoke<MetadataType>('update_track_metadata', buildInvokeArgs(path, fields));
      const newPath = result.path ?? path;
      const pathChanged = newPath !== path;
      const existingImage = library.find((s) => s.path === path)?.image;
      const newLibraryImage = resolveImageUpdate(fields, result, path, newPath, pathChanged, existingImage);

      setLibrary?.(
        library.map((s) => (s.path === path ? { ...s, ...result, path: newPath, image: newLibraryImage } : s)),
      );

      if (metadata?.path === path) {
        let nowPlayingImage = metadata.image;
        if (fields.removeCoverArt) nowPlayingImage = undefined;
        else if (result.image) nowPlayingImage = result.image;
        setMetadata?.({ ...metadata, ...result, path: newPath, image: nowPlayingImage });
        if (pathChanged) setCurrentPath?.(newPath);
      }

      if (pathChanged) {
        setCurrentPlaylist?.(currentPlaylist.map((p) => (p === path ? newPath : p)));
      }

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

  /**
   * Batch-edit multiple songs with the same fields. All backend calls run
   * sequentially, but a single setLibrary is applied at the end so the stale-
   * closure problem (each iteration overwriting the previous with the same base
   * library snapshot) never occurs.
   */
  const batchUpdateSongsMetadata = useCallback(
    async (paths: string[], fields: EditFields): Promise<void> => {
      const updates: SongUpdate[] = [];

      for (const path of paths) {
        const existingImage = library.find((s) => s.path === path)?.image;
        const result = await invoke<MetadataType>('update_track_metadata', buildInvokeArgs(path, fields));
        const newPath = result.path ?? path;
        const pathChanged = newPath !== path;
        const newLibraryImage = resolveImageUpdate(fields, result, path, newPath, pathChanged, existingImage);
        updates.push({ oldPath: path, newPath, pathChanged, result, newLibraryImage });
      }

      if (updates.length === 0) return;

      // One library update covering all songs
      setLibrary?.(
        library.map((s) => {
          const u = updates.find((u) => u.oldPath === s.path);
          return u ? { ...s, ...u.result, path: u.newPath, image: u.newLibraryImage } : s;
        }),
      );

      // Now-playing
      const nowPlayingUpdate = updates.find((u) => u.oldPath === metadata?.path);
      if (nowPlayingUpdate && metadata) {
        let nowPlayingImage = metadata.image;
        if (fields.removeCoverArt) nowPlayingImage = undefined;
        else if (nowPlayingUpdate.result.image) nowPlayingImage = nowPlayingUpdate.result.image;
        setMetadata?.({
          ...metadata,
          ...nowPlayingUpdate.result,
          path: nowPlayingUpdate.newPath,
          image: nowPlayingImage,
        });
        if (nowPlayingUpdate.pathChanged) setCurrentPath?.(nowPlayingUpdate.newPath);
      }

      // Playback queue
      const anyRenamed = updates.some((u) => u.pathChanged);
      if (anyRenamed) {
        setCurrentPlaylist?.(currentPlaylist.map((p) => updates.find((u) => u.oldPath === p)?.newPath ?? p));
      }

      // Playlists
      if (playlists && setPlaylists && anyRenamed) {
        setPlaylists((prev) =>
          prev.map((pl) => ({
            ...pl,
            songs: pl.songs.map((s) => {
              const u = s.path ? updates.find((u) => u.oldPath === s.path) : undefined;
              return u ? { ...s, path: u.newPath, title: u.result.title, artist: u.result.artist } : s;
            }),
          })),
        );
      }
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

  return { updateSongMetadata, batchUpdateSongsMetadata };
};
