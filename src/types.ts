export type RepeatMode = 'none' | 'one' | 'all';

export interface DurationType {
  duration_seconds?: number;
  duration_formatted?: string;
}
export interface MetadataType {
  album?: string;
  artist?: string;
  title?: string;
  year?: string;
  track?: number;
  image?: string;
  path?: string;
  duration?: DurationType;
}

export interface PlaylistType {
  id: string;
  name: string;
  songs: MetadataType[];
}

export interface LyricsTrackResponse {
  id: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
  lyricsFile?: string | null;
}

export interface LyricsPreview {
  hasSynced: boolean;
  hasPlain: boolean;
  instrumental: boolean;
  duration?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
}
