export const LYRICS_UPDATED_EVENT = 'songbridge:lyrics-updated';

export function notifyLyricsUpdated(songPath: string) {
  window.dispatchEvent(new CustomEvent<string>(LYRICS_UPDATED_EVENT, { detail: songPath }));
}
