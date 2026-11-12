import { FaArrowDownWideShort, FaArrowUpWideShort } from 'react-icons/fa6';
import { useI18n } from '../../i18n/I18nProvider';
import type { SongSortDirection, SongSortField } from '../../hooks/useSongSort';
import { DirectionButton, SortGroup, SortSelect } from './styles';

interface Props {
  compact?: boolean;
  sortField: SongSortField;
  sortDirection: SongSortDirection;
  onSortFieldChange: (_field: SongSortField) => void;
  onSortDirectionChange: (_direction: SongSortDirection) => void;
}

const SongSortControl = ({
  compact = false,
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
}: Props) => {
  const { t } = useI18n();
  const nextDirection = sortDirection === 'asc' ? 'desc' : 'asc';

  return (
    <SortGroup>
      <SortSelect
        $compact={compact}
        aria-label={t('song.sortBy')}
        title={t('song.sortBy')}
        value={sortField}
        onChange={(event) => onSortFieldChange(event.target.value as SongSortField)}
      >
        <option value="original">{t('song.sortOriginal')}</option>
        <option value="title">{t('song.sortTitle')}</option>
        <option value="album">{t('song.sortAlbum')}</option>
        <option value="artist">{t('song.sortArtist')}</option>
        <option value="year">{t('song.sortYear')}</option>
      </SortSelect>
      <DirectionButton
        type="button"
        disabled={sortField === 'original'}
        aria-pressed={sortDirection === 'desc'}
        aria-label={t(nextDirection === 'asc' ? 'song.sortAscending' : 'song.sortDescending')}
        title={t(nextDirection === 'asc' ? 'song.sortAscending' : 'song.sortDescending')}
        onClick={() => onSortDirectionChange(nextDirection)}
      >
        {sortDirection === 'asc' ? (
          <FaArrowUpWideShort aria-hidden="true" />
        ) : (
          <FaArrowDownWideShort aria-hidden="true" />
        )}
      </DirectionButton>
    </SortGroup>
  );
};

export default SongSortControl;
