import LastfmImport, { LastfmImportButton } from '../Lastfm/LastfmImport';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FaImage } from 'react-icons/fa6';
import Modal from '../Modal/Modal';
import { Button, Input } from '../Modal/styles';
import { MetadataType } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';
import { copyTextToClipboard } from '../../utils/clipboard';
import {
  CheckboxRow,
  CoverArtActions,
  CoverArtButton,
  CoverArtPreview,
  CoverArtSection,
  ErrorCopyButton,
  ErrorPanel,
  ErrorText,
  Extension,
  FieldGroup,
  FilenameRow,
  Label,
  RemoveCoverButton,
} from './styles';

interface EditFields {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  track?: number;
  coverArtPath?: string;
  removeCoverArt?: boolean;
  newFilename?: string;
}

interface Props {
  song: MetadataType | null;
  onClose: () => void;
  onSave: (_path: string, _fields: EditFields) => Promise<unknown>;
}

function parsePath(fullPath: string) {
  const normalized = fullPath.replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() ?? '';
  const dotIdx = fileName.lastIndexOf('.');
  const baseName = dotIdx > 0 ? fileName.slice(0, dotIdx) : fileName;
  const extension = dotIdx > 0 ? fileName.slice(dotIdx) : '';
  return { baseName, extension };
}

const EditMetadataModal = ({ song, onClose, onSave }: Props) => {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [year, setYear] = useState('');
  const [track, setTrack] = useState('');

  const [filename, setFilename] = useState('');
  const [originalBaseName, setOriginalBaseName] = useState('');
  const [extension, setExtension] = useState('');
  const [useAutoFilename, setUseAutoFilename] = useState(false);

  const [coverArtPath, setCoverArtPath] = useState<string | null>(null);
  const [removeCoverArt, setRemoveCoverArt] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCopied, setErrorCopied] = useState(false);

  // Reset all fields when the target song changes
  useEffect(() => {
    if (song) {
      setTitle(song.title ?? '');
      setArtist(song.artist ?? '');
      setAlbum(song.album ?? '');
      setYear(song.year ?? '');
      setTrack(song.track !== undefined ? String(song.track) : '');

      const { baseName, extension: ext } = parsePath(song.path ?? '');
      setOriginalBaseName(baseName);
      setFilename(baseName);
      setExtension(ext);
      setUseAutoFilename(false);

      setCoverArtPath(null);
      setRemoveCoverArt(false);
      setPreviewUrl(null);
      setPreviewLoading(false);
      setSaving(false);
      setImporting(false);
      setError(null);
      setErrorCopied(false);
    }
  }, [song]);

  // Keep filename in sync with title/artist while the checkbox is on
  useEffect(() => {
    if (!useAutoFilename) return;
    const a = artist.trim();
    const t = title.trim();
    const suggested = a && t ? `${a} - ${t}` : t || a;
    setFilename(suggested);
  }, [title, artist, useAutoFilename]);

  const displayedArt = removeCoverArt ? null : coverArtPath ? previewUrl : (song?.image ?? null);
  const hasArt = displayedArt !== null;

  const handleChangeCover = async () => {
    const result = await open({
      multiple: false,
      filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
    });
    if (!result) return;
    const path = Array.isArray(result) ? result[0] : result;
    setCoverArtPath(path);
    setRemoveCoverArt(false);
    setPreviewLoading(true);
    setPreviewUrl(null);
    setError(null);
    setErrorCopied(false);
    try {
      const preview = await invoke<string>('get_image_preview', { path });
      setPreviewUrl(preview);
    } catch (cause) {
      setError(`${t('metadata.coverPreviewFailed')}: ${String(cause)}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCopyError = async () => {
    if (!error) return;
    try {
      await copyTextToClipboard(error);
      setErrorCopied(true);
      window.setTimeout(() => setErrorCopied(false), 1500);
    } catch {
      setErrorCopied(false);
    }
  };

  const handleRemoveCover = () => {
    setCoverArtPath(null);
    setRemoveCoverArt(true);
    setPreviewUrl(null);
    setError(null);
    setErrorCopied(false);
  };

  const handleSave = async () => {
    if (!song?.path || saving) return;
    setSaving(true);
    setError(null);
    setErrorCopied(false);
    try {
      const trackNum = track.trim() ? parseInt(track.trim(), 10) : undefined;
      const trimmedFilename = filename.trim();
      await onSave(song.path, {
        title: title.trim() || undefined,
        artist: artist.trim() || undefined,
        album: album.trim() || undefined,
        year: year.trim() || undefined,
        track: trackNum !== undefined && !isNaN(trackNum) ? trackNum : undefined,
        coverArtPath: coverArtPath ?? undefined,
        removeCoverArt,
        // Only pass newFilename when it actually differs from the original
        newFilename: trimmedFilename && trimmedFilename !== originalBaseName ? trimmedFilename : undefined,
      });
      onClose();
    } catch (e) {
      setError(String(e));
      setErrorCopied(false);
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saving) handleSave();
  };

  return (
    <Modal
      isOpen={song !== null}
      onClose={onClose}
      title={t('metadata.editTitle')}
      dismissible={!saving}
      footer={
        importing ? undefined : (
          <>
            <Button $variant="ghost" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button $variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </>
        )
      }
    >
      {importing && song ? (
        <LastfmImport
          songs={[song]}
          kind="track"
          onBack={() => setImporting(false)}
          onClose={onClose}
          onBusy={setSaving}
        />
      ) : (
        <>
          <LastfmImportButton onClick={() => setImporting(true)} />
          <CoverArtSection>
            <CoverArtPreview $hasImage={hasArt}>
              {displayedArt ? <img src={displayedArt} alt={t('metadata.coverArt')} /> : <FaImage />}
            </CoverArtPreview>
            <CoverArtActions>
              <CoverArtButton onClick={handleChangeCover} disabled={saving || previewLoading}>
                {previewLoading ? t('common.loading') : t('common.changeCover')}
              </CoverArtButton>
              {(hasArt || coverArtPath) && (
                <RemoveCoverButton onClick={handleRemoveCover} disabled={saving}>
                  {t('common.removeCover')}
                </RemoveCoverButton>
              )}
            </CoverArtActions>
          </CoverArtSection>

          <FieldGroup>
            <Label htmlFor="em-title">{t('metadata.title')}</Label>
            <Input id="em-title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={handleKeyDown} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="em-artist">{t('metadata.artist')}</Label>
            <Input
              id="em-artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="em-album">{t('metadata.album')}</Label>
            <Input id="em-album" value={album} onChange={(e) => setAlbum(e.target.value)} onKeyDown={handleKeyDown} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="em-year">{t('metadata.year')}</Label>
            <Input
              id="em-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={4}
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="em-track">{t('metadata.trackNumber')}</Label>
            <Input
              id="em-track"
              type="number"
              min="1"
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="em-filename">{t('metadata.filename')}</Label>
            <FilenameRow>
              <Input
                id="em-filename"
                value={filename}
                onChange={(e) => {
                  setFilename(e.target.value);
                  setUseAutoFilename(false);
                }}
                onKeyDown={handleKeyDown}
                disabled={useAutoFilename}
                style={{ flex: 1, minWidth: 0 }}
              />
              {extension && <Extension>{extension}</Extension>}
            </FilenameRow>
            <CheckboxRow>
              <input type="checkbox" checked={useAutoFilename} onChange={(e) => setUseAutoFilename(e.target.checked)} />
              {t('metadata.autoFilename')}
            </CheckboxRow>
          </FieldGroup>

          {error && (
            <ErrorPanel role="alert">
              <ErrorText>{error}</ErrorText>
              <ErrorCopyButton type="button" onClick={() => void handleCopyError()}>
                {errorCopied ? t('metadata.errorCopied') : t('metadata.copyError')}
              </ErrorCopyButton>
            </ErrorPanel>
          )}
        </>
      )}
    </Modal>
  );
};

export default EditMetadataModal;
