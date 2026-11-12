import { FaArrowDownWideShort, FaArrowUpWideShort } from 'react-icons/fa6';
import { useI18n } from '../../i18n/I18nProvider';
import type { SongSortDirection, SongSortField } from '../../hooks/useSongSort';
import { DirectionButton, SortFieldLabel, SortGroup, SortSelect } from './styles';

interface Props {
  compact?: boolean;
  sortField: SongSortField;
  sortDirection: SongSortDirection;
  sortFields?: Exclude<SongSortField, 'original'>[];
  includeOriginalOrder?: boolean;
  onSortFieldChange: (_field: SongSortField) => void;
  onSortDirectionChange: (_direction: SongSortDirection) => void;
}

const SongSortControl = ({
  compact = false,
  sortField,
  sortDirection,
  sortFields = ['title', 'album', 'artist', 'year'],
  includeOriginalOrder = true,
  onSortFieldChange,
  onSortDirectionChange,
}: Props) => {
  const { t } = useI18n();
  const nextDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  const showSelect = sortFields.length > 1 || includeOriginalOrder;
  const fieldLabel =
    sortField === 'title'
      ? t('song.sortTitle')
      : sortField === 'album'
        ? t('song.sortAlbum')
        : sortField === 'artist'
          ? t('song.sortArtist')
          : t('song.sortYear');

  return (
    <SortGroup>
      {showSelect ? (
        <SortSelect
          $compact={compact}
          aria-label={t('song.sortBy')}
          title={t('song.sortBy')}
          value={sortField}
          onChange={(event) => onSortFieldChange(event.target.value as SongSortField)}
        >
          {includeOriginalOrder && <option value="original">{t('song.sortOriginal')}</option>}
          {sortFields.map((field) => (
            <option value={field} key={field}>
              {field === 'title'
                ? t('song.sortTitle')
                : field === 'album'
                  ? t('song.sortAlbum')
                  : field === 'artist'
                    ? t('song.sortArtist')
                    : t('song.sortYear')}
            </option>
          ))}
        </SortSelect>
      ) : (
        <SortFieldLabel>{fieldLabel}</SortFieldLabel>
      )}
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
