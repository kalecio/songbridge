import { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import Playlist from '../../Components/Playlist/Playlist';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import { useI18n } from '../../i18n/I18nProvider';
import Page from '../../Components/Page/Page';
import PageHeader from '../../Components/PageHeader/PageHeader';
import Count from '../../Components/Count/Count';
import { displayTitle } from '../../songDisplay';
import { SortControls, SortDirectionButton, SortSelect } from './styles';

type SortField = 'title' | 'album' | 'artist' | 'year';
type SortDirection = 'asc' | 'desc';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const Songs = () => {
  const { t } = useI18n();
  const { library, isScanning, currentPath, setCurrentPath, setCurrentPlaylist } = useContext(AppContext);
  const [sortBy, setSortBy] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const songs = useMemo(() => {
    return [...library].sort((a, b) => {
      const primaryComparison =
        sortBy === 'year'
          ? (Number(a.year) || 0) - (Number(b.year) || 0)
          : collator.compare(
              sortBy === 'title' ? displayTitle(a) : (a[sortBy] ?? ''),
              sortBy === 'title' ? displayTitle(b) : (b[sortBy] ?? ''),
            );
      const comparison = primaryComparison || collator.compare(displayTitle(a), displayTitle(b));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [library, sortBy, sortDirection]);

  if (isScanning) {
    return <StatusMessage>{t('song.scanning')}</StatusMessage>;
  }

  if (library.length === 0) {
    return <StatusMessage>{t('song.noSongs')}</StatusMessage>;
  }

  const playSong = (song: MetadataType) => {
    const paths = songs.map((s) => s.path).filter((p): p is string => Boolean(p));
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(song.path);
  };

  return (
    <Page>
      <PageHeader>
        {t('sidebar.songs')} <Count>{library.length}</Count>
      </PageHeader>
      <SortControls>
        <label htmlFor="song-sort">{t('song.sortBy')}</label>
        <SortSelect id="song-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortField)}>
          <option value="title">{t('song.sortTitle')}</option>
          <option value="album">{t('song.sortAlbum')}</option>
          <option value="artist">{t('song.sortArtist')}</option>
          <option value="year">{t('song.sortYear')}</option>
        </SortSelect>
        <SortDirectionButton
          type="button"
          aria-pressed={sortDirection === 'desc'}
          aria-label={t(sortDirection === 'asc' ? 'song.sortDescending' : 'song.sortAscending')}
          title={t(sortDirection === 'asc' ? 'song.sortDescending' : 'song.sortAscending')}
          onClick={() => setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))}
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </SortDirectionButton>
      </SortControls>
      {songs.length > 0 ? (
        <Playlist
          songs={songs}
          name={t('sidebar.songs')}
          type={t('sidebar.library')}
          activePath={currentPath}
          onSongClick={playSong}
          onPlayAll={() => songs[0] && playSong(songs[0])}
        />
      ) : (
        <StatusMessage>{t('song.noSongs')}</StatusMessage>
      )}
    </Page>
  );
};

export default Songs;
