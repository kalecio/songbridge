import { useContext, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { FaPlay, FaListUl, FaPen, FaTrash, FaPenToSquare } from 'react-icons/fa6';
import { AppContext } from '../../Context/AppContext';
import { MetadataType, PlaylistType } from '../../types';
import AlbumImage from '../../Components/AlbumImage/AlbumImage';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import ContextMenu, { ContextMenuItem } from '../../Components/ContextMenu/ContextMenu';
import { useLazyAlbumArt } from '../../hooks/useLazyAlbumArt';
import { isFavouritesPlaylist, sortFavouritesFirst } from '../../hooks/useFavourites';
import { useQueueActions } from '../../hooks/useQueueActions';
import { usePlaylistActions } from '../../hooks/usePlaylistActions';
import { usePlayHistory } from '../../hooks/usePlayHistory';
import { useAddToPlaylistMenu } from '../../hooks/useAddToPlaylistMenu';
import { useMetadataActions } from '../../hooks/useMetadataActions';
import { useLyricsMenu } from '../../hooks/useLyricsMenu';
import EditMetadataModal from '../../Components/EditMetadataModal/EditMetadataModal';
import { displayTitle } from '../../songDisplay';
import { useI18n } from '../../i18n/I18nProvider';
import { useSongSort } from '../../hooks/useSongSort';
import SongSortControl from '../../Components/SongSortControl/SongSortControl';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  SearchContainer,
  ResultsSection,
  SectionTitle,
  SongRow,
  SongInfo,
  SongTitle,
  SongArtist,
  ArtistRow,
  ArtistAvatar,
  ArtistName,
  AlbumRow,
  AlbumArt,
  AlbumInfo,
  AlbumTitle,
  AlbumArtist,
  FavouriteThumb,
  FavouriteHeart,
  NoResults,
  ArtistImage,
  ArtistContainer,
  SearchEyebrow,
  SearchHeading,
  SongSortRow,
} from './styles';

function normalize(s?: string) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

const SearchArtistAvatar = ({ name, songs }: { name: string; songs: MetadataType[] }) => {
  const eager = songs.find((s) => s.image)?.image;
  const coverPath = songs.find((s) => s.path)?.path;
  const image = useLazyAlbumArt(coverPath, eager);
  return <ArtistAvatar>{image ? <ArtistImage src={image} alt={name} /> : name.charAt(0).toUpperCase()}</ArtistAvatar>;
};

const VirtualSearchSongs = ({
  songs,
  onPlay,
  onContextMenu,
}: {
  songs: MetadataType[];
  onPlay: (_song: MetadataType) => void;
  onContextMenu: (_event: MouseEvent, _song: MetadataType) => void;
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
    getItemKey: (index) => songs[index].path ?? index,
  });

  if (songs.length <= 100) {
    return (
      <div>
        {songs.map((song, index) => {
          const title = displayTitle(song);
          return (
            <SongRow
              key={song.path ?? index}
              onClick={() => onPlay(song)}
              onContextMenu={(event) => onContextMenu(event, song)}
            >
              <AlbumImage metadata={song} height="2.5rem" width="2.5rem" />
              <SongInfo>
                <SongTitle title={title}>{title}</SongTitle>
                <SongArtist title={song.artist}>{song.artist}</SongArtist>
              </SongInfo>
            </SongRow>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={parentRef} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const song = songs[item.index];
          const title = displayTitle(song);
          return (
            <div
              key={item.key}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}
            >
              <SongRow onClick={() => onPlay(song)} onContextMenu={(event) => onContextMenu(event, song)}>
                <AlbumImage metadata={song} height="2.5rem" width="2.5rem" />
                <SongInfo>
                  <SongTitle title={title}>{title}</SongTitle>
                  <SongArtist title={song.artist}>{song.artist}</SongArtist>
                </SongInfo>
              </SongRow>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type SearchMenu =
  | { kind: 'artist'; x: number; y: number; songs: MetadataType[] }
  | { kind: 'album'; x: number; y: number; albumName: string }
  | { kind: 'playlist'; x: number; y: number; playlist: PlaylistType }
  | { kind: 'song'; x: number; y: number; song: MetadataType };

const Search = () => {
  const { t, tc } = useI18n();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const { library, playlists = [], setCurrentPath, setCurrentPlaylist } = useContext(AppContext);
  const navigate = useNavigate();
  const [menu, setMenu] = useState<SearchMenu | null>(null);
  const [editSong, setEditSong] = useState<MetadataType | null>(null);
  const { playSongs, addToQueue, playNext } = useQueueActions();
  const { renamePlaylist, deletePlaylist } = usePlaylistActions();
  const { recordPlaylistPlay } = usePlayHistory();
  const buildAddToPlaylistItem = useAddToPlaylistMenu();
  const { updateSongMetadata } = useMetadataActions();
  const buildLyricsMenuItem = useLyricsMenu();

  const q = normalize(query);
  const libraryIndex = useMemo(() => {
    const songsByAlbum = new Map<string, MetadataType[]>();
    const playlistSongsByPath = new Map<string, MetadataType>();
    const normalizedSongs = library.map((song) => {
      const album = song.album ?? 'Unknown Album';
      const albumSongs = songsByAlbum.get(album);
      if (albumSongs) albumSongs.push(song);
      else songsByAlbum.set(album, [song]);
      if (song.path) playlistSongsByPath.set(song.path, song);
      return {
        song,
        title: normalize(song.title),
        artist: normalize(song.artist),
        album: normalize(song.album),
      };
    });
    return { songsByAlbum, playlistSongsByPath, normalizedSongs };
  }, [library]);

  const matchingSongs = useMemo(
    () =>
      libraryIndex.normalizedSongs
        .filter(({ title, artist, album }) => title.includes(q) || artist.includes(q) || album.includes(q))
        .map(({ song }) => song),
    [libraryIndex, q],
  );
  const songSort = useSongSort(matchingSongs);

  const matchingPlaylists: PlaylistType[] = useMemo(
    () => sortFavouritesFirst(playlists.filter((pl) => normalize(pl.name).includes(q))),
    [playlists, q],
  );

  const artists = useMemo(() => {
    const artistMap = new Map<string, MetadataType[]>();
    for (const song of matchingSongs) {
      const key = song.artist ?? 'Unknown Artist';
      if (!artistMap.has(key)) artistMap.set(key, []);
      artistMap.get(key)!.push(song);
    }
    return Array.from(artistMap.entries()).filter(([name]) => normalize(name).includes(q));
  }, [matchingSongs, q]);

  const albums = useMemo(() => {
    const albumMap = new Map<string, MetadataType>();
    for (const song of matchingSongs) {
      const key = song.album ?? 'Unknown Album';
      if (!albumMap.has(key)) albumMap.set(key, song);
    }
    return Array.from(albumMap.entries()).filter(([name]) => normalize(name).includes(q));
  }, [matchingSongs, q]);

  const playSong = (song: MetadataType) => {
    const paths = songSort.sortedSongs.map((s) => s.path).filter((p): p is string => Boolean(p));
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(song.path);
  };

  const menuItems = (m: SearchMenu): ContextMenuItem[] => {
    switch (m.kind) {
      case 'song':
        return [
          { label: t('common.playNext'), icon: <FaPlay />, onSelect: () => playNext(m.song) },
          { label: t('common.addToQueue'), icon: <FaListUl />, onSelect: () => addToQueue([m.song]) },
          buildAddToPlaylistItem(m.song),
          { type: 'divider' as const },
          { label: t('common.editMetadata'), icon: <FaPenToSquare />, onSelect: () => setEditSong(m.song) },
          buildLyricsMenuItem(m.song),
        ];
      case 'artist': {
        const empty = m.songs.length === 0;
        return [
          { label: t('common.play'), icon: <FaPlay />, onSelect: () => playSongs(m.songs), disabled: empty },
          { label: t('common.addToQueue'), icon: <FaListUl />, onSelect: () => addToQueue(m.songs), disabled: empty },
        ];
      }
      case 'album': {
        const albumSongs = libraryIndex.songsByAlbum.get(m.albumName) ?? [];
        const empty = albumSongs.length === 0;
        return [
          { label: t('common.play'), icon: <FaPlay />, onSelect: () => playSongs(albumSongs), disabled: empty },
          {
            label: t('common.addToQueue'),
            icon: <FaListUl />,
            onSelect: () => addToQueue(albumSongs),
            disabled: empty,
          },
        ];
      }
      case 'playlist': {
        const isFavourites = isFavouritesPlaylist(m.playlist.id);
        const empty = m.playlist.songs.length === 0;
        return [
          {
            label: t('common.play'),
            icon: <FaPlay />,
            onSelect: () => {
              playSongs(m.playlist.songs);
              recordPlaylistPlay(m.playlist.id);
            },
            disabled: empty,
          },
          {
            label: t('common.addToQueue'),
            icon: <FaListUl />,
            onSelect: () => addToQueue(m.playlist.songs),
            disabled: empty,
          },
          { type: 'divider' },
          {
            label: t('common.rename'),
            icon: <FaPen />,
            onSelect: () => renamePlaylist(m.playlist),
            disabled: isFavourites,
          },
          {
            label: t('common.deletePlaylist'),
            icon: <FaTrash />,
            onSelect: () => deletePlaylist(m.playlist),
            disabled: isFavourites,
            danger: true,
          },
        ];
      }
    }
  };

  if (!q) return null;

  const hasResults = matchingSongs.length > 0 || matchingPlaylists.length > 0;

  if (!hasResults) {
    return <StatusMessage>{t('search.noResults', { query })}</StatusMessage>;
  }

  return (
    <SearchContainer>
      <div>
        <SearchEyebrow>{t('search.yourLibrary')}</SearchEyebrow>
        <SearchHeading>{t('search.resultsFor', { query })}</SearchHeading>
      </div>
      {artists.length > 0 && (
        <ResultsSection>
          <SectionTitle>{t('search.artists')}</SectionTitle>
          <ArtistContainer>
            {artists.map(([name, metadata]) => (
              <ArtistRow
                key={name}
                onClick={() => navigate(`/artists/${encodeURIComponent(name)}`)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ kind: 'artist', x: e.clientX, y: e.clientY, songs: metadata });
                }}
              >
                <SearchArtistAvatar name={name} songs={metadata} />
                <ArtistName title={name}>{name}</ArtistName>
              </ArtistRow>
            ))}
          </ArtistContainer>
        </ResultsSection>
      )}

      {albums.length > 0 && (
        <ResultsSection>
          <SectionTitle>{t('search.albums')}</SectionTitle>
          {albums.map(([name, song]) => (
            <AlbumRow
              key={name}
              onClick={() => navigate(`/albums/${encodeURIComponent(name)}`)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ kind: 'album', x: e.clientX, y: e.clientY, albumName: name });
              }}
            >
              <AlbumArt>
                <AlbumImage metadata={song} height="100%" width="100%" />
              </AlbumArt>
              <AlbumInfo>
                <AlbumTitle title={name}>{name}</AlbumTitle>
                <AlbumArtist title={song.artist}>{song.artist}</AlbumArtist>
              </AlbumInfo>
            </AlbumRow>
          ))}
        </ResultsSection>
      )}

      {matchingPlaylists.length > 0 && (
        <ResultsSection>
          <SectionTitle>{t('search.playlists')}</SectionTitle>
          {matchingPlaylists.map((pl) => {
            const cover = libraryIndex.playlistSongsByPath.get(pl.songs[0]?.path ?? '') ?? pl.songs[0];
            const fav = isFavouritesPlaylist(pl.id);
            return (
              <AlbumRow
                key={pl.id}
                onClick={() => navigate(`/playlist/${pl.id}`)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ kind: 'playlist', x: e.clientX, y: e.clientY, playlist: pl });
                }}
              >
                {fav ? (
                  <FavouriteThumb>
                    <FavouriteHeart />
                  </FavouriteThumb>
                ) : (
                  <AlbumArt>
                    <AlbumImage metadata={cover} height="100%" width="100%" />
                  </AlbumArt>
                )}
                <AlbumInfo>
                  <AlbumTitle title={pl.name}>{pl.name}</AlbumTitle>
                  <AlbumArtist>{tc('count.song', pl.songs.length)}</AlbumArtist>
                </AlbumInfo>
              </AlbumRow>
            );
          })}
        </ResultsSection>
      )}

      {matchingSongs.length > 0 && (
        <ResultsSection>
          <SectionTitle>{t('search.songs')}</SectionTitle>
          {matchingSongs.length > 1 && (
            <SongSortRow>
              <SongSortControl
                sortField={songSort.sortField}
                sortDirection={songSort.sortDirection}
                onSortFieldChange={songSort.setSortField}
                onSortDirectionChange={songSort.setSortDirection}
              />
            </SongSortRow>
          )}
          <VirtualSearchSongs
            songs={songSort.sortedSongs}
            onPlay={playSong}
            onContextMenu={(e, song) => {
              e.preventDefault();
              setMenu({ kind: 'song', x: e.clientX, y: e.clientY, song });
            }}
          />
        </ResultsSection>
      )}

      {matchingSongs.length > 0 && (
        <NoResults>
          {matchingSongs.length} {matchingSongs.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
        </NoResults>
      )}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu)} onClose={() => setMenu(null)} />}
      <EditMetadataModal song={editSong} onClose={() => setEditSong(null)} onSave={updateSongMetadata} />
    </SearchContainer>
  );
};

export default Search;
