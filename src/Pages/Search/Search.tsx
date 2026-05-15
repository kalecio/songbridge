import { useContext, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { FaPlay, FaListUl, FaPen, FaTrash } from 'react-icons/fa6';
import { AppContext } from '../../Context/AppContext';
import { MetadataType, PlaylistType } from '../../types';
import AlbumImage from '../../Components/AlbumImage/AlbumImage';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import ContextMenu, { ContextMenuItem } from '../../Components/ContextMenu/ContextMenu';
import { useLazyAlbumArt } from '../../hooks/useLazyAlbumArt';
import { isFavouritesPlaylist, sortFavouritesFirst } from '../../hooks/useFavourites';
import { useQueueActions } from '../../hooks/useQueueActions';
import { usePlaylistActions } from '../../hooks/usePlaylistActions';
import { displayTitle } from '../../songDisplay';
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
} from './styles';

function normalize(s?: string) {
  return (s ?? '').toLowerCase();
}

const SearchArtistAvatar = ({ name, songs }: { name: string; songs: MetadataType[] }) => {
  const eager = songs.find((s) => s.image)?.image;
  const coverPath = songs.find((s) => s.path)?.path;
  const image = useLazyAlbumArt(coverPath, eager);
  return <ArtistAvatar>{image ? <ArtistImage src={image} alt={name} /> : name.charAt(0).toUpperCase()}</ArtistAvatar>;
};

type SearchMenu =
  | { kind: 'artist'; x: number; y: number; songs: MetadataType[] }
  | { kind: 'album'; x: number; y: number; albumName: string }
  | { kind: 'playlist'; x: number; y: number; playlist: PlaylistType }
  | { kind: 'song'; x: number; y: number; song: MetadataType };

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const { library, playlists = [], setCurrentPath, setCurrentPlaylist } = useContext(AppContext);
  const navigate = useNavigate();
  const [menu, setMenu] = useState<SearchMenu | null>(null);
  const { playSongs, addToQueue, playNext } = useQueueActions();
  const { renamePlaylist, deletePlaylist } = usePlaylistActions();

  const songsOfAlbum = (albumName: string) => library.filter((s) => (s.album ?? 'Unknown Album') === albumName);

  const q = normalize(query);

  const matchingSongs = library.filter(
    (s) => normalize(s.title).includes(q) || normalize(s.artist).includes(q) || normalize(s.album).includes(q),
  );

  const matchingPlaylists: PlaylistType[] = sortFavouritesFirst(
    playlists.filter((pl) => normalize(pl.name).includes(q)),
  );

  const artistMap = new Map<string, MetadataType[]>();
  for (const song of matchingSongs) {
    const key = song.artist ?? 'Unknown Artist';
    if (!artistMap.has(key)) artistMap.set(key, []);
    artistMap.get(key)!.push(song);
  }
  const artists = Array.from(artistMap.entries()).filter(([name]) => normalize(name).includes(q));

  const albumMap = new Map<string, MetadataType>();
  for (const song of matchingSongs) {
    const key = song.album ?? 'Unknown Album';
    if (!albumMap.has(key)) albumMap.set(key, song);
  }
  const albums = Array.from(albumMap.entries()).filter(([name]) => normalize(name).includes(q));

  const playSong = (song: MetadataType) => {
    const paths = matchingSongs.map((s) => s.path).filter((p): p is string => Boolean(p));
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(song.path);
  };

  const menuItems = (m: SearchMenu): ContextMenuItem[] => {
    switch (m.kind) {
      case 'song':
        return [
          { label: 'Play next', icon: <FaPlay />, onSelect: () => playNext(m.song) },
          { label: 'Add to queue', icon: <FaListUl />, onSelect: () => addToQueue([m.song]) },
        ];
      case 'artist': {
        const empty = m.songs.length === 0;
        return [
          { label: 'Play', icon: <FaPlay />, onSelect: () => playSongs(m.songs), disabled: empty },
          { label: 'Add to queue', icon: <FaListUl />, onSelect: () => addToQueue(m.songs), disabled: empty },
        ];
      }
      case 'album': {
        const albumSongs = songsOfAlbum(m.albumName);
        const empty = albumSongs.length === 0;
        return [
          { label: 'Play', icon: <FaPlay />, onSelect: () => playSongs(albumSongs), disabled: empty },
          { label: 'Add to queue', icon: <FaListUl />, onSelect: () => addToQueue(albumSongs), disabled: empty },
        ];
      }
      case 'playlist': {
        const isFavourites = isFavouritesPlaylist(m.playlist.id);
        const empty = m.playlist.songs.length === 0;
        return [
          { label: 'Play', icon: <FaPlay />, onSelect: () => playSongs(m.playlist.songs), disabled: empty },
          { label: 'Add to queue', icon: <FaListUl />, onSelect: () => addToQueue(m.playlist.songs), disabled: empty },
          { type: 'divider' },
          { label: 'Rename', icon: <FaPen />, onSelect: () => renamePlaylist(m.playlist), disabled: isFavourites },
          {
            label: 'Delete playlist',
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
    return <StatusMessage>No results for &ldquo;{query}&rdquo;</StatusMessage>;
  }

  return (
    <SearchContainer>
      {artists.length > 0 && (
        <ResultsSection>
          <SectionTitle>Artists</SectionTitle>
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
          <SectionTitle>Albums</SectionTitle>
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
          <SectionTitle>Playlists</SectionTitle>
          {matchingPlaylists.map((pl) => {
            const cover = library.find((l) => l.path === pl.songs[0]?.path) ?? pl.songs[0];
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
                  <AlbumArtist>
                    {pl.songs.length} {pl.songs.length === 1 ? 'song' : 'songs'}
                  </AlbumArtist>
                </AlbumInfo>
              </AlbumRow>
            );
          })}
        </ResultsSection>
      )}

      {matchingSongs.length > 0 && (
        <ResultsSection>
          <SectionTitle>Songs</SectionTitle>
          {matchingSongs.map((song, i) => {
            const title = displayTitle(song);
            return (
              <SongRow
                key={song.path ?? i}
                onClick={() => playSong(song)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ kind: 'song', x: e.clientX, y: e.clientY, song });
                }}
              >
                <AlbumImage metadata={song} height="2.5rem" width="2.5rem" />
                <SongInfo>
                  <SongTitle title={title}>{title}</SongTitle>
                  <SongArtist title={song.artist}>{song.artist}</SongArtist>
                </SongInfo>
              </SongRow>
            );
          })}
        </ResultsSection>
      )}

      {matchingSongs.length > 0 && (
        <NoResults>
          {matchingSongs.length} {matchingSongs.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
        </NoResults>
      )}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu)} onClose={() => setMenu(null)} />}
    </SearchContainer>
  );
};

export default Search;
