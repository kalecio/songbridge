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

export interface GroupEditFields {
  artist?: string;
  album?: string;
  year?: string;
  coverArtPath?: string;
  removeCoverArt?: boolean;
}

interface Props {
  groupType: 'album' | 'artist';
  songs: MetadataType[] | null;
  onClose: () => void;
  onSave: (_fields: GroupEditFields) => Promise<void>;
}

const EditGroupMetadataModal = ({ groupType, songs, onClose, onSave }: Props) => {
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [year, setYear] = useState('');

  const [coverArtPath, setCoverArtPath] = useState<string | null>(null);
  const [removeCoverArt, setRemoveCoverArt] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [saving, setSaving] = useState(false);
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
      const fields: GroupEditFields =
        groupType === 'album'
          ? {
              artist: artist.trim() || undefined,
              album: album.trim() || undefined,
              year: year.trim() || undefined,
              coverArtPath: coverArtPath ?? undefined,
              removeCoverArt,
            }
          : { artist: artist.trim() || undefined };
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
      ? `Edit album — ${songs?.[0]?.album ?? 'Unknown Album'}`
      : `Edit artist — ${songs?.[0]?.artist ?? 'Unknown Artist'}`;

  return (
    <Modal
      isOpen={songs !== null && songs.length > 0}
      onClose={onClose}
      title={modalTitle}
      dismissible={!saving}
      footer={
        <>
          <Button $variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button $variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <SubtitleText>
        {count} {count === 1 ? 'song' : 'songs'} will be updated
      </SubtitleText>

      {groupType === 'album' && (
        <CoverArtSection>
          <CoverArtPreview $hasImage={hasArt}>
            {displayedArt ? <img src={displayedArt} alt="Cover art" /> : <FaImage />}
          </CoverArtPreview>
          <CoverArtActions>
            <CoverArtButton onClick={handleChangeCover} disabled={saving || previewLoading}>
              {previewLoading ? 'Loading…' : 'Change cover'}
            </CoverArtButton>
            {(hasArt || coverArtPath) && (
              <RemoveCoverButton onClick={handleRemoveCover} disabled={saving}>
                Remove cover
              </RemoveCoverButton>
            )}
          </CoverArtActions>
        </CoverArtSection>
      )}

      <FieldGroup>
        <Label htmlFor="egm-artist">Artist</Label>
        <Input id="egm-artist" value={artist} onChange={(e) => setArtist(e.target.value)} onKeyDown={handleKeyDown} />
      </FieldGroup>

      {groupType === 'album' && (
        <>
          <FieldGroup>
            <Label htmlFor="egm-album">Album</Label>
            <Input id="egm-album" value={album} onChange={(e) => setAlbum(e.target.value)} onKeyDown={handleKeyDown} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="egm-year">Year</Label>
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
    </Modal>
  );
};

export default EditGroupMetadataModal;
