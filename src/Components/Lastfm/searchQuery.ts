import type { MetadataType } from '../../types';

export function getFilenameSearchName(path?: string): string {
  if (!path) return '';
  const filename = path.split(/[\\/]/).pop() ?? '';
  const extensionIndex = filename.lastIndexOf('.');
  const name = extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
  return name.replace(/_+/g, ' ').trim();
}

export function getLastfmSearchQuery(song: MetadataType | undefined, kind: 'track' | 'album'): string {
  const taggedName = (kind === 'track' ? song?.title : song?.album)?.trim();
  return taggedName || getFilenameSearchName(song?.path);
}
