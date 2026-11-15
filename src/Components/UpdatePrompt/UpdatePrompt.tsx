import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import Modal from '../Modal/Modal';
import { Button, Message } from '../Modal/styles';
import { useI18n } from '../../i18n/I18nProvider';

const REMINDER_KEY = 'songbridge-update-reminder';
const DAY_MS = 24 * 60 * 60 * 1000;

type AvailableUpdate = { currentVersion: string; version: string; body?: string | null };
type UpdateProgressEvent = {
  event: 'Started' | 'Progress' | 'Finished';
  data: { contentLength?: number; chunkLength?: number };
};

const formatNotes = (notes: string) =>
  notes
    .split('\n')
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, '')
        .replace(/^[-*]\s+/, '• ')
        .replace(/\*\*(.*?)\*\*/g, '$1'),
    )
    .join('\n')
    .trim();

const UpdatePrompt = () => {
  const { t } = useI18n();
  const [releaseInfo, setReleaseInfo] = useState<{ current: string; latest: string; notes: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const available = await invoke<AvailableUpdate | null>('check_for_update');
      if (!available) return;
      setReleaseInfo({
        current: available.currentVersion,
        latest: available.version,
        notes: formatNotes(available.body?.trim() || t('update.noChangelog')),
      });
      setIsOpen(true);
      window.localStorage.setItem(
        REMINDER_KEY,
        JSON.stringify({ version: available.version, due: Date.now() + DAY_MS }),
      );
    } catch {
      // Update checks are best-effort and should never affect startup.
    }
  }, [t]);

  useEffect(() => {
    void checkForUpdate();
  }, [checkForUpdate]);

  useEffect(() => {
    if (!releaseInfo || isOpen) return;
    let due = Date.now() + DAY_MS;
    try {
      const reminder = window.localStorage.getItem(REMINDER_KEY);
      const parsed = reminder ? (JSON.parse(reminder) as { due?: number; version?: string }) : null;
      if (parsed?.version === releaseInfo.latest && parsed.due) due = parsed.due;
    } catch {
      window.localStorage.removeItem(REMINDER_KEY);
    }
    const timer = window.setTimeout(
      () => {
        void checkForUpdate();
      },
      Math.max(0, due - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [checkForUpdate, isOpen, releaseInfo]);

  const remindLater = async () => {
    setIsOpen(false);
  };

  const installNow = async () => {
    if (!releaseInfo) return;
    setInstalling(true);
    setError(false);
    setProgress(null);
    let unlisten: (() => void) | undefined;
    try {
      unlisten = await listen<UpdateProgressEvent>('songbridge-update-progress', (event) => {
        if (event.payload.event === 'Started') setProgress(0);
        if (event.payload.event === 'Progress' && event.payload.data.chunkLength) {
          const chunkLength = event.payload.data.chunkLength;
          setProgress((current) => (current === null ? chunkLength : current + chunkLength));
        }
      });
      await invoke('install_update', { expectedVersion: releaseInfo.latest });
      await relaunch();
    } catch {
      setError(true);
      setInstalling(false);
    } finally {
      unlisten?.();
    }
  };

  return (
    <Modal
      isOpen={isOpen && Boolean(releaseInfo)}
      title={t('update.title')}
      onClose={() => void remindLater()}
      maxWidth="36rem"
      dismissible={!installing}
    >
      {releaseInfo && (
        <>
          <Message>{t('update.available', { current: releaseInfo.current, latest: releaseInfo.latest })}</Message>
          <div
            style={{ maxHeight: '45vh', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
            aria-label={t('update.changelog')}
          >
            <strong>{t('update.changelog')}</strong>
            <p style={{ margin: '0.5rem 0 0' }}>{formatNotes(releaseInfo.notes)}</p>
          </div>
          {installing && (
            <Message>
              {progress === null ? t('update.downloading') : t('update.downloadProgress', { bytes: progress })}
            </Message>
          )}
          {error && <Message role="alert">{t('update.installFailed')}</Message>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button type="button" $variant="ghost" onClick={() => void remindLater()} disabled={installing}>
              {t('update.later')}
            </Button>
            <Button type="button" $variant="primary" onClick={() => void installNow()} disabled={installing}>
              {installing ? t('update.installing') : t('update.installNow')}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default UpdatePrompt;
