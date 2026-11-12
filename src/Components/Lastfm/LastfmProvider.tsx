import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n/I18nProvider';
import type { TranslationKey } from '../../i18n/types';

export interface LastfmPlay {
  id: string;
  path: string;
  track: { title: string; artist: string; album: string };
  timestamp: number;
  listened: number;
  required: number;
  status: string;
}
export interface LastfmStatus {
  configured: boolean;
  connected: boolean;
  username: string | null;
  enabled: boolean;
  persistent: boolean;
  authorizing: boolean;
  error: string | null;
  current: LastfmPlay | null;
  pending: number;
  history: LastfmPlay[];
}
const Context = createContext<{ status: LastfmStatus | null; refresh: () => Promise<void> }>({
  status: null,
  refresh: async () => {},
});

export const LastfmProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<LastfmStatus | null>(null);
  const refresh = useCallback(async () => {
    const result = await invoke<LastfmStatus>('lastfm_status');
    setStatus(result);
  }, []);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await invoke<LastfmStatus>('lastfm_status');
        if (active) setStatus(result);
      } catch {
        /* Commands unavailable in browser previews. */
      }
      if (active) timer = setTimeout(poll, 1000);
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  return <Context.Provider value={{ status, refresh }}>{children}</Context.Provider>;
};
export const useLastfm = () => useContext(Context);
const reasons = new Set([
  'listening',
  'awaiting_play',
  'queue_full',
  'not_connected',
  'disabled',
  'missing_metadata',
  'unknown_duration',
  'too_short',
  'load_failed',
  'skipped',
  'interrupted',
  'queued',
  'scrobbled',
  'offline',
  'temporary',
  'rate_limited',
  'reauthenticate',
  'application_error',
  'invalid_request',
  'invalid_response',
  'artist_rejected',
  'track_rejected',
  'too_old',
  'future_timestamp',
  'daily_limit',
  'rejected',
  'not_configured',
  'token_expired',
  'not_authorized',
  'secure_storage',
  'database',
  'no_results',
  'invalid_artwork',
]);
export const useLastfmReason = () => {
  const { t } = useI18n();
  return (code: string, play?: LastfmPlay | null) =>
    t(('lastfm.reason.' + (reasons.has(code) ? code : 'temporary')) as TranslationKey, {
      listened: Math.floor(play?.listened ?? 0),
      required: Math.ceil(play?.required ?? 0),
    });
};
