import { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import Playlist from '../../Components/Playlist/Playlist';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import { useI18n } from '../../i18n/I18nProvider';
import Page from '../../Components/Page/Page';
import PageHeader from '../../Components/PageHeader/PageHeader';
import Count from '../../Components/Count/Count';
import LibraryControls from '../../Components/LibraryControls/LibraryControls';
import { displayTitle } from '../../songDisplay';

const Songs = () => {
  const { t } = useI18n();
  const { library, isScanning, currentPath, setCurrentPath, setCurrentPlaylist } = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const songs = useMemo(() => {
    return library
      .filter((song) => !normalizedQuery || `${displayTitle(song)} ${song.artist ?? ''} ${song.album ?? ''}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        if (sortBy === 'year') return (Number(b.year) || 0) - (Number(a.year) || 0) || displayTitle(a).localeCompare(displayTitle(b));
        return displayTitle(a).localeCompare(displayTitle(b));
      });
  }, [library, normalizedQuery, sortBy]);

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
        {t('sidebar.songs')} <Count>{songs.length}</Count>
      </PageHeader>
      <LibraryControls
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        searchLabel="Search songs, artists, or albums"
        sortOptions={[{ value: 'name', label: 'Name' }, { value: 'year', label: 'Year' }]}
      />
      {!songs.length ? (
        <StatusMessage>{normalizedQuery ? 'No songs match your search.' : t('song.noSongs')}</StatusMessage>
      ) : (
        <Playlist
          songs={songs}
          name={t('sidebar.songs')}
          type={t('sidebar.library')}
          activePath={currentPath}
          onSongClick={playSong}
          onPlayAll={() => songs[0] && playSong(songs[0])}
        />
      )}
    </Page>
  );
};

export default Songs;
