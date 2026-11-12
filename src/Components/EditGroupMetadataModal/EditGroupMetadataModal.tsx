import LastfmImport, { LastfmImportButton } from '../Lastfm/LastfmImport';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FaImage } from 'react-icons/fa6';
import Modal from '../Modal/Modal';
import { Button, Input } from '../Modal/styles';
import { MetadataType } from '../../types';
import {
  CoverArtActions,
  CoverArtButton,
  CoverArtPreview,
  CoverArtSection,
  ErrorText,
  FieldGroup,
  Label,
  RemoveCoverButton,
} from '../EditMetadataModal/styles';
import { SubtitleText } from './styles';
import { useI18n } from '../../i18n/I18nProvider';

export interface GroupEditFields {
  artist?: string;
  album?: string;
  year?: string;
  coverArtPath?: string;
  removeCoverArt?: boolean;
  updateFields?: Array<'artist' | 'album' | 'year'>;
}

interface Props {
  groupType: 'album' | 'artist';
  songs: MetadataType[] | null;
  onClose: () => void;
  onSave: (_fields: GroupEditFields) => Promise<void>;
}

const EditGroupMetadataModal = ({ groupType, songs, onClose, onSave }: Props) => {
  const { t, tc } = useI18n();
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [year, setYear] = useState('');

  const [coverArtPath, setCoverArtPath] = useState<string | null>(null);
  const [removeCoverArt, setRemoveCoverArt] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!songs || songs.length === 0) return;
    const first = songs[0];
    setArtist(first.artist ?? '');
    setAlbum(first.album ?? '');
    setYear(first.year ?? '');
    setCoverArtPath(null);
    setRemoveCoverArt(false);
    setPreviewUrl(null);
    setPreviewLoading(false);
    setSaving(false);
    setImporting(false);
    setError(null);
  }, [songs]);

  const existingArt = songs?.[0]?.image ?? null;
  const displayedArt = removeCoverArt ? null : (previewUrl ?? existingArt);
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
    try {
      const preview = await invoke<string>('get_image_preview', { path });
      setPreviewUrl(preview);
    } catch {
      // Preview failed — backend still processes it on save.
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRemoveCover = () => {
    setCoverArtPath(null);
    setRemoveCoverArt(true);
    setPreviewUrl(null);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const firstSong = songs?.[0];
      const updateFields: GroupEditFields['updateFields'] = [];
      if (artist.trim() !== (firstSong?.artist ?? '')) updateFields.push('artist');
      if (groupType === 'album' && album.trim() !== (firstSong?.album ?? '')) updateFields.push('album');
      if (groupType === 'album' && year.trim() !== (firstSong?.year ?? '')) updateFields.push('year');

      const fields: GroupEditFields = {
        artist: artist.trim() || undefined,
        album: groupType === 'album' ? album.trim() || undefined : undefined,
        year: groupType === 'album' ? year.trim() || undefined : undefined,
        coverArtPath: coverArtPath ?? undefined,
        removeCoverArt: groupType === 'album' ? removeCoverArt : undefined,
        updateFields,
      };
      await onSave(fields);
      onClose();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saving) handleSave();
  };

  const count = songs?.length ?? 0;
  const modalTitle =
    groupType === 'album'
      ? t('metadata.editAlbum', { name: songs?.[0]?.album ?? t('common.unknownAlbum') })
      : t('metadata.editArtist', { name: songs?.[0]?.artist ?? t('common.unknownArtist') });

  return (
    <Modal
      isOpen={songs !== null && songs.length > 0}
      onClose={onClose}
      title={modalTitle}
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
      {importing && songs ? (
        <LastfmImport
          songs={songs}
          kind="album"
          onBack={() => setImporting(false)}
          onClose={onClose}
          onBusy={setSaving}
        />
      ) : (
        <>
          {groupType === 'album' && <LastfmImportButton onClick={() => setImporting(true)} />}
          <SubtitleText>{tc('count.trackWillUpdate', count)}</SubtitleText>

          {groupType === 'album' && (
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
          )}

          <FieldGroup>
            <Label htmlFor="egm-artist">{t('metadata.artist')}</Label>
            <Input
              id="egm-artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </FieldGroup>

          {groupType === 'album' && (
            <>
              <FieldGroup>
                <Label htmlFor="egm-album">{t('metadata.album')}</Label>
                <Input
                  id="egm-album"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="egm-year">{t('metadata.year')}</Label>
                <Input
                  id="egm-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={4}
                />
              </FieldGroup>
            </>
          )}

          {error && <ErrorText>{error}</ErrorText>}
        </>
      )}
    </Modal>
  );
};

export default EditGroupMetadataModal;
