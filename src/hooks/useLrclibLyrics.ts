import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LyricsTrackResponse, LyricsPreview } from '../types';

export interface SearchLyricsParams {
  trackName?: string;
  artistName?: string;
  albumName?: string;
  query?: string;
}

export interface DownloadLyricsParams {
  songPath: string;
  trackId: number;
  preferSynced: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

export function useLrclibLyrics() {
  const searchLyrics = useCallback(async (params: SearchLyricsParams): Promise<LyricsTrackResponse[]> => {
    return await invoke('search_lrclib_lyrics', {
      trackName: params.trackName,
      artistName: params.artistName,
      albumName: params.albumName,
      query: params.query,
    });
  }, []);

  const getLyricsById = useCallback(async (trackId: number): Promise<LyricsTrackResponse> => {
    return await invoke('get_lrclib_lyrics_by_id', { trackId });
  }, []);

  const getLyricsPreview = useCallback(async (trackId: number): Promise<LyricsPreview> => {
    return await invoke('get_lrclib_lyrics_preview', { trackId });
  }, []);

  const downloadLyrics = useCallback(async (params: DownloadLyricsParams): Promise<void> => {
    await invoke('download_lrclib_lyrics', {
      songPath: params.songPath,
      trackId: params.trackId,
      preferSynced: params.preferSynced,
      plainLyrics: params.plainLyrics,
      syncedLyrics: params.syncedLyrics,
    });
  }, []);

  return {
    searchLyrics,
    getLyricsById,
    getLyricsPreview,
    downloadLyrics,
  };
}
