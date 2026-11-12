import { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import Playlist from '../../Components/Playlist/Playlist';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import Page from '../../Components/Page/Page';
import PageHeader from '../../Components/PageHeader/PageHeader';
import Count from '../../Components/Count/Count';
import LibraryControls from '../../Components/LibraryControls/LibraryControls';
import { displayTitle } from '../../songDisplay';

const Songs = () => {
  const { library, isScanning, currentPath, setCurrentPath, setCurrentPlaylist } = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const songs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return library
      .filter((song) =>
        !normalizedQuery ||
        `${displayTitle(song)} ${song.artist ?? ''} ${song.album ?? ''}`.toLocaleLowerCase().includes(normalizedQuery),
      )
      .sort((a, b) => {
        if (sortBy === 'year') return (Number(b.year) || 0) - (Number(a.year) || 0) || displayTitle(a).localeCompare(displayTitle(b));
        return displayTitle(a).localeCompare(displayTitle(b));
      });
  }, [library, query, sortBy]);

  if (isScanning) {
    return <StatusMessage>Scanning music library…</StatusMessage>;
  }

  if (library.length === 0) {
    return <StatusMessage>No songs found in your music library.</StatusMessage>;
  }

  const playSong = (song: MetadataType) => {
    const paths = songs.map((s) => s.path).filter((p): p is string => Boolean(p));
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(song.path);
  };

  return (
    <Page>
      <PageHeader>
        Songs <Count>{songs.length}</Count>
      </PageHeader>
      <LibraryControls
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        searchLabel="Search songs, artists, or albums"
        sortOptions={[{ value: 'name', label: 'Name' }, { value: 'year', label: 'Year' }]}
      />
      {songs.length === 0 ? (
        <StatusMessage>No songs match your search.</StatusMessage>
      ) : (
        <Playlist
          songs={songs}
          name="Songs"
          type="Library"
          activePath={currentPath}
          onSongClick={playSong}
          onPlayAll={() => songs[0] && playSong(songs[0])}
        />
      )}
    </Page>
  );
};

export default Songs;
