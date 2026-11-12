import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../Modal/styles';
import { useLastfm, useLastfmReason } from './LastfmProvider';
import { Actions, History, Panel } from './styles';
import LastfmLibraryReview from './LastfmLibraryReview';

export const LastfmHistory = () => {
  const { status } = useLastfm();
  const { t, locale } = useI18n();
  const reason = useLastfmReason();
  return (
    <History aria-label={t('lastfm.history')}>
      {status?.history.map((play) => (
        <li key={play.id}>
          <strong>{play.track.title || t('lyrics.unknownTrack')}</strong> · {play.track.artist}
          <small>{reason(play.status, play)}</small>
          {play.timestamp > 0 && <small>{new Date(play.timestamp * 1000).toLocaleString(locale)}</small>}
        </li>
      ))}
      {!status?.history.length && <li>{t('lastfm.noHistory')}</li>}
    </History>
  );
};

const LastfmSettings = () => {
  const { status, refresh } = useLastfm();
  const { t } = useI18n();
  const reason = useLastfmReason();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(String(e));
    } finally {
      await refresh().catch(() => {});
      setBusy(false);
    }
  };
  return (
    <Panel>
      <p>{t('lastfm.description')}</p>
      <p>{t('lastfm.nextPlay')}</p>
      {!status?.configured && <p role="status">{reason('not_configured')}</p>}
      {status?.connected && (
        <>
          <a
            href={'https://www.last.fm/user/' + encodeURIComponent(status.username ?? '')}
            onClick={(e) => {
              e.preventDefault();
              const url = e.currentTarget.href;
              void run(() => openUrl(url));
            }}
            target="_blank"
            rel="noreferrer"
          >
            {t('lastfm.connectedAs', { name: status.username ?? '' })}
          </a>
          {!status.persistent && <p>{t('lastfm.sessionOnly')}</p>}
          <label>
            <input
              type="checkbox"
              checked={status.enabled}
              disabled={busy}
              onChange={(e) => void run(() => invoke('lastfm_set_enabled', { enabled: e.target.checked }))}
            />
            {t('lastfm.enable')}
          </label>
          <p>{t('lastfm.pending', { count: status.pending })}</p>
          <LastfmLibraryReview />
        </>
      )}
      <Actions>
        {(!status?.connected || status.error === 'reauthenticate') && (
          <Button
            disabled={busy || !status?.configured}
            onClick={() =>
              void run(async () => {
                const url = await invoke<string>('lastfm_connect');
                await openUrl(url);
              })
            }
          >
            {t('lastfm.connect')}
          </Button>
        )}
        {(status?.connected || status?.persistent) && (
          <Button $variant="ghost" disabled={busy} onClick={() => setConfirmDisconnect(true)}>
            {t('lastfm.disconnect')}
          </Button>
        )}
      </Actions>
      {status?.authorizing && (
        <>
          <p>{t('lastfm.authorizationHelp')}</p>
          <Button $variant="ghost" disabled={busy} onClick={() => void run(() => invoke('lastfm_cancel_connection'))}>
            {t('common.cancel')}
          </Button>
          <label>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={busy} />
            {t('lastfm.remember')}
          </label>
          <Button disabled={busy} onClick={() => void run(() => invoke('lastfm_complete_connection', { remember }))}>
            {t('lastfm.complete')}
          </Button>
        </>
      )}
      {confirmDisconnect && (
        <>
          <p>{t('lastfm.disconnectHelp')}</p>
          <Actions>
            <Button
              $variant="danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await invoke('lastfm_disconnect');
                  setConfirmDisconnect(false);
                })
              }
            >
              {t('lastfm.disconnect')}
            </Button>
            <Button $variant="ghost" disabled={busy} onClick={() => setConfirmDisconnect(false)}>
              {t('common.cancel')}
            </Button>
          </Actions>
        </>
      )}
      {(error || status?.error) && <p role="alert">{reason(error || status?.error || '')}</p>}
      <details>
        <summary>{t('lastfm.history')}</summary>
        <LastfmHistory />
      </details>
      <small>
        <a
          href="https://www.last.fm"
          onClick={(e) => {
            e.preventDefault();
            const url = e.currentTarget.href;
            void run(() => openUrl(url));
          }}
          target="_blank"
          rel="noreferrer"
        >
          {t('lastfm.poweredBy')}
        </a>
      </small>
    </Panel>
  );
};
export default LastfmSettings;
