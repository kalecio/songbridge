import { invoke } from '@tauri-apps/api/core';
import type { MetadataType } from '../../types';
import EditMetadataModal from '../EditMetadataModal/EditMetadataModal';
import { useMetadataActions } from '../../hooks/useMetadataActions';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { FaLastfm, FaCheck, FaClock, FaCircleInfo } from 'react-icons/fa6';
import { useI18n } from '../../i18n/I18nProvider';
import Modal from '../Modal/Modal';
import { Button } from '../Modal/styles';
import { useLastfm, useLastfmReason } from './LastfmProvider';
import { LastfmHistory } from './LastfmSettings';
import { Panel, StatusButton } from './styles';

export default function LastfmIndicator() {
  const { status } = useLastfm();
  const { t } = useI18n();
  const reason = useLastfmReason();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MetadataType | null>(null);
  const [error, setError] = useState('');
  const { updateSongMetadata } = useMetadataActions();
  if (!status?.configured || !status.connected) return null;
  const play = status.current;
  const code = status.error || (!status.enabled ? 'disabled' : (play?.status ?? 'awaiting_play'));
  const message = reason(code, play);
  const Icon =
    code === 'scrobbled' ? FaCheck : code === 'queued' ? FaClock : code === 'listening' ? FaLastfm : FaCircleInfo;
  return (
    <>
      <StatusButton title={message} aria-label={'Last.fm: ' + message} onClick={() => setOpen(true)}>
        <Icon aria-hidden="true" />
        Last.fm
      </StatusButton>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Last.fm"
        footer={
          <>
            <Button
              $variant="ghost"
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
            >
              {t('navigation.settings')}
            </Button>
            <Button onClick={() => setOpen(false)}>{t('lastfm.finish')}</Button>
          </>
        }
      >
        <Panel>
          <p role="status">{message}</p>
          {play && code !== play.status && <p>{reason(play.status, play)}</p>}
          {play?.status === 'missing_metadata' && (
            <Button
              $variant="ghost"
              onClick={() => {
                void invoke<MetadataType>('get_metadata', { path: play.path })
                  .then((song) => {
                    setOpen(false);
                    setEditing(song);
                    setError('');
                  })
                  .catch(() => setError('load_failed'));
              }}
            >
              {t('metadata.editTitle')}
            </Button>
          )}
          {error && <p role="alert">{reason(error)}</p>}
          <LastfmHistory />
        </Panel>
      </Modal>
      <EditMetadataModal song={editing} onClose={() => setEditing(null)} onSave={updateSongMetadata} />
    </>
  );
}
