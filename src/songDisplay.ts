import { MetadataType } from './types';

/** Strip directory prefix and trailing extension from a filesystem path. */
export const filenameWithoutExt = (path: string): string => {
  const lastSep = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const filename = lastSep >= 0 ? path.slice(lastSep + 1) : path;
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
};

/**
 * Best-effort display name for a track. Prefers the parsed `title` tag, falls
 * back to the filename without extension when the file has no/blank title,
 * and finally to a static placeholder when even the path is missing.
 */
export const displayTitle = (
  song: Pick<MetadataType, 'title' | 'path'> | undefined,
  fallback: string = 'Unknown track',
): string => {
  const trimmed = song?.title?.trim();
  if (trimmed) return trimmed;
  if (song?.path) return filenameWithoutExt(song.path);
  return fallback;
};
