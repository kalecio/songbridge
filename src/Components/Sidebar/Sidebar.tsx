import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import { FaPlay, FaListUl, FaPen, FaTrash } from 'react-icons/fa6';
import appLogo from '../../../app-icon.png';
import { AppContext } from '../../Context/AppContext';
import { MetadataType, PlaylistType } from '../../types';
import AlbumImage from '../AlbumImage/AlbumImage';
import ContextMenu, { ContextMenuItem } from '../ContextMenu/ContextMenu';
import {
  AlbumsIcon,
  AppLogo,
  LogoImg,
  ArtistsIcon,
  BackIcon,
  FavouriteThumb,
  HeartIcon,
  HomeIcon,
  Menu,
  MenuItem,
  PlaylistItem,
  PlaylistsRow,
  PlaylistThumb,
  PlusButtonContainer,
  PlusIcon,
  QueueHeader,
  SectionLabel,
  SidebarContainer,
  SongsIcon,
} from './styles';
import { isFavouritesPlaylist, sortFavouritesFirst } from '../../hooks/useFavourites';
import { useQueueActions } from '../../hooks/useQueueActions';
import { usePlaylistActions } from '../../hooks/usePlaylistActions';
import { displayTitle } from '../../songDisplay';

type SidebarMenu =
  | { kind: 'queue'; x: number; y: number; song: MetadataType }
  | { kind: 'playlist'; x: number; y: number; playlist: PlaylistType };

const Sidebar = () => {
  const [songs, setSongs] = useState<MetadataType[]>([]);
  const [menu, setMenu] = useState<SidebarMenu | null>(null);
  const metadataCache = useRef(new Map<string, MetadataType>());
  const context = useContext(AppContext);
  const { showQueue, setShowQueue, setCurrentPath, currentPlaylist, playlists, currentPath, library } = context;
  const navigate = useNavigate();
  const location = useLocation();
  const { playSongs, addToQueue, playNext, removeFromQueue } = useQueueActions();
  const { renamePlaylist, deletePlaylist } = usePlaylistActions();

  useEffect(() => {
    if (currentPlaylist.length === 0) {
      setSongs([]);
      return;
    }
    const getSongs = async () => {
      const uncached = currentPlaylist.filter((p) => !metadataCache.current.has(p));
      await Promise.all(
        uncached.map(async (path) => {
          const metadata = await invoke<MetadataType>('get_metadata', { path });
          metadataCache.current.set(path, { ...metadata, path });
        }),
      );
      setSongs(currentPlaylist.map((p) => metadataCache.current.get(p)!));
    };
    getSongs();
  }, [currentPlaylist]);

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  const queueMenuItems = (song: MetadataType): ContextMenuItem[] => [
    { label: 'Play next', icon: <FaPlay />, onSelect: () => playNext(song) },
    { type: 'divider' },
    { label: 'Remove from queue', icon: <FaTrash />, onSelect: () => removeFromQueue(song.path), danger: true },
  ];

  const playlistMenuItems = (playlist: PlaylistType): ContextMenuItem[] => {
    const isFavourites = isFavouritesPlaylist(playlist.id);
    const empty = playlist.songs.length === 0;
    return [
      { label: 'Play', icon: <FaPlay />, onSelect: () => playSongs(playlist.songs), disabled: empty },
      { label: 'Add to queue', icon: <FaListUl />, onSelect: () => addToQueue(playlist.songs), disabled: empty },
      { type: 'divider' },
      { label: 'Rename', icon: <FaPen />, onSelect: () => renamePlaylist(playlist), disabled: isFavourites },
      {
        label: 'Delete playlist',
        icon: <FaTrash />,
        onSelect: () => deletePlaylist(playlist),
        disabled: isFavourites,
        danger: true,
      },
    ];
  };

  return (
    <SidebarContainer>
      <AppLogo>
        <LogoImg src={appLogo} alt="Songbridge" />
      </AppLogo>

      {!showQueue && (
        <>
          <SectionLabel>Menu</SectionLabel>
          <Menu>
            <MenuItem $active={isActive('/')} onClick={() => navigate('/')}>
              <HomeIcon /> Home
            </MenuItem>
            <MenuItem $active={isActive('/artists')} onClick={() => navigate('/artists')}>
              <ArtistsIcon /> Artists
            </MenuItem>
            <MenuItem $active={isActive('/albums')} onClick={() => navigate('/albums')}>
              <AlbumsIcon /> Albums
            </MenuItem>
            <MenuItem $active={isActive('/songs')} onClick={() => navigate('/songs')}>
              <SongsIcon /> Songs
            </MenuItem>
          </Menu>

          <PlaylistsRow>
            <SectionLabel>Playlists</SectionLabel>
            <PlusButtonContainer aria-label="manage playlists" onClick={() => navigate('/playlist')}>
              <PlusIcon />
            </PlusButtonContainer>
          </PlaylistsRow>
          <Menu>
            {songs.length > 0 && <MenuItem onClick={() => setShowQueue?.(true)}>Playing now</MenuItem>}
            {sortFavouritesFirst(playlists ?? []).map((playlist) => (
              <PlaylistItem
                key={playlist.id}
                $active={location.pathname === `/playlist/${playlist.id}`}
                onClick={() => navigate(`/playlist/${playlist.id}`)}
                onContextMenu={(e) => {
                  if (isFavouritesPlaylist(playlist.id)) {
                    return null;
                  }
                  e.preventDefault();
                  setMenu({ kind: 'playlist', x: e.clientX, y: e.clientY, playlist });
                }}
              >
                {isFavouritesPlaylist(playlist.id) ? (
                  <FavouriteThumb>
                    <HeartIcon />
                  </FavouriteThumb>
                ) : (
                  <PlaylistThumb>
                    <AlbumImage
                      metadata={library.find((l) => l.path === playlist.songs[0]?.path) ?? playlist.songs[0]}
                      height="100%"
                      width="100%"
                    />
                  </PlaylistThumb>
                )}
                {playlist.name}
              </PlaylistItem>
            ))}
          </Menu>
        </>
      )}

      {showQueue && (
        <>
          <QueueHeader aria-label="close queue" onClick={() => setShowQueue?.(false)}>
            <BackIcon /> Queue
          </QueueHeader>
          <Menu>
            {songs.map((song) => (
              <MenuItem
                $active={song.path === currentPath}
                key={song.path ?? `${song.title}-${song.artist}`}
                onClick={() => setCurrentPath?.(song.path)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ kind: 'queue', x: e.clientX, y: e.clientY, song });
                }}
                title={displayTitle(song)}
              >
                <AlbumImage metadata={song} height="2.25rem" width="2.25rem" />
                {displayTitle(song)}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.kind === 'queue' ? queueMenuItems(menu.song) : playlistMenuItems(menu.playlist)}
          onClose={() => setMenu(null)}
        />
      )}
    </SidebarContainer>
  );
};

export default Sidebar;
