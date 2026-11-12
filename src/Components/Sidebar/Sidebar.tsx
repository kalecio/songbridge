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
  HeartIcon,
  AppName,
  SidebarFooter,
  Menu,
  MenuItem,
  PlaylistItem,
  PlaylistsRow,
  QueueHeader,
  SectionLabel,
  SidebarContainer,
  SidebarContent,
  ResizeHandle,
  SongsIcon,
} from './styles';
import { isFavouritesPlaylist, sortFavouritesFirst } from '../../hooks/useFavourites';
import { useQueueActions } from '../../hooks/useQueueActions';
import { usePlaylistActions } from '../../hooks/usePlaylistActions';
import { usePlayHistory } from '../../hooks/usePlayHistory';
import { useAddToPlaylistMenu } from '../../hooks/useAddToPlaylistMenu';
import { useLyricsMenu } from '../../hooks/useLyricsMenu';
import { useSidebarWidth, SIDEBAR_MIN_WIDTH } from '../../hooks/useSidebarWidth';
import { displayTitle } from '../../songDisplay';
import { useI18n } from '../../i18n/I18nProvider';

type SidebarMenu =
  | { kind: 'queue'; x: number; y: number; song: MetadataType }
  | { kind: 'playlist'; x: number; y: number; playlist: PlaylistType };

const Sidebar = () => {
  const { t } = useI18n();
  const { width, maxWidth, isResizing, handleProps } = useSidebarWidth();
  const [songs, setSongs] = useState<MetadataType[]>([]);
  const [menu, setMenu] = useState<SidebarMenu | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // `dragstart` and the first `dragover` can fire before React flushes the
  // state update, leaving the closure with a stale `dragFromIndex === null`.
  // If we skip `preventDefault()` then, the browser rejects the drop entirely.
  // The ref always reflects the latest value synchronously.
  const dragFromRef = useRef<number | null>(null);
  const metadataCache = useRef(new Map<string, MetadataType>());
  const context = useContext(AppContext);
  const { showQueue, setShowQueue, setCurrentPath, currentPlaylist, playlists, currentPath, library } = context;
  const navigate = useNavigate();
  const location = useLocation();
  const { playSongs, addToQueue, playNext, removeFromQueue, reorderQueue } = useQueueActions();
  const resetDrag = () => {
    dragFromRef.current = null;
    setDragFromIndex(null);
    setDragOverIndex(null);
  };
  const { renamePlaylist, deletePlaylist } = usePlaylistActions();
  const { recordPlaylistPlay } = usePlayHistory();
  const buildAddToPlaylistItem = useAddToPlaylistMenu();
  const buildLyricsMenuItem = useLyricsMenu();

  useEffect(() => {
    if (currentPlaylist.length === 0) {
      setSongs([]);
      return;
    }
    const libraryMap = new Map(library.map((s) => [s.path, s]));
    const getSongs = async () => {
      const uncached = currentPlaylist.filter((p) => !libraryMap.has(p) && !metadataCache.current.has(p));
      await Promise.all(
        uncached.map(async (path) => {
          const metadata = await invoke<MetadataType>('get_metadata', { path });
          metadataCache.current.set(path, { ...metadata, path });
        }),
      );
      setSongs(currentPlaylist.map((p) => libraryMap.get(p) ?? metadataCache.current.get(p)!));
    };
    getSongs();
  }, [currentPlaylist, library]);

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  const queueMenuItems = (song: MetadataType): ContextMenuItem[] => [
    { label: t('common.playNext'), icon: <FaPlay />, onSelect: () => playNext(song) },
    buildAddToPlaylistItem(song),
    buildLyricsMenuItem(song),
    { type: 'divider' },
    { label: t('common.removeFromQueue'), icon: <FaTrash />, onSelect: () => removeFromQueue(song.path), danger: true },
  ];

  const playlistMenuItems = (playlist: PlaylistType): ContextMenuItem[] => {
    const isFavourites = isFavouritesPlaylist(playlist.id);
    const empty = playlist.songs.length === 0;
    return [
      {
        label: t('common.play'),
        icon: <FaPlay />,
        onSelect: () => {
          playSongs(playlist.songs);
          recordPlaylistPlay(playlist.id);
        },
        disabled: empty,
      },
      {
        label: t('common.addToQueue'),
        icon: <FaListUl />,
        onSelect: () => addToQueue(playlist.songs),
        disabled: empty,
      },
      { type: 'divider' },
      { label: t('common.rename'), icon: <FaPen />, onSelect: () => renamePlaylist(playlist), disabled: isFavourites },
      {
        label: t('common.deletePlaylist'),
        icon: <FaTrash />,
        onSelect: () => deletePlaylist(playlist),
        disabled: isFavourites,
        danger: true,
      },
    ];
  };

  return (
    <SidebarContainer $width={width} $resizing={isResizing}>
      <SidebarContent>
        <AppLogo>
          <LogoImg src={appLogo} alt="" />
          <AppName>Songbridge</AppName>
        </AppLogo>

        {!showQueue && (
          <>
            <SectionLabel>{t('sidebar.library')}</SectionLabel>
            <Menu>
              <MenuItem $active={isActive('/') || isActive('/albums')} onClick={() => navigate('/')}>
                <AlbumsIcon /> {t('sidebar.albums')}
              </MenuItem>
              <MenuItem $active={isActive('/songs')} onClick={() => navigate('/songs')}>
                <SongsIcon /> {t('sidebar.songs')}
              </MenuItem>
              <MenuItem $active={isActive('/artists')} onClick={() => navigate('/artists')}>
                <ArtistsIcon /> {t('sidebar.artists')}
              </MenuItem>
            </Menu>
            <PlaylistsRow>
              <SectionLabel>{t('sidebar.playlists')}</SectionLabel>
            </PlaylistsRow>
            <Menu>
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
                  {isFavouritesPlaylist(playlist.id) ? <HeartIcon /> : <FaListUl />}
                  <span className="sidebar-item-label" title={playlist.name}>
                    {isFavouritesPlaylist(playlist.id) ? t('sidebar.favourites') : playlist.name}
                  </span>
                </PlaylistItem>
              ))}
              <MenuItem aria-label={t('sidebar.managePlaylists')} onClick={() => navigate('/playlist')}>
                <span aria-hidden="true">＋</span> {t('sidebar.newPlaylist')}
              </MenuItem>
            </Menu>
            <SidebarFooter>
              <span /> {t('sidebar.collectionNearby')}
            </SidebarFooter>
          </>
        )}

        {showQueue && (
          <>
            <QueueHeader aria-label={t('sidebar.closeQueue')} onClick={() => setShowQueue?.(false)}>
              <BackIcon /> {t('sidebar.queue')}
            </QueueHeader>
            <Menu>
              {songs.map((song, index) => {
                const isDragging = dragFromIndex === index;
                const showIndicator = dragFromIndex !== null && dragOverIndex === index && dragFromIndex !== index;
                const dropAbove = showIndicator && (dragFromIndex as number) > index;
                const dropBelow = showIndicator && (dragFromIndex as number) < index;
                return (
                  <MenuItem
                    $active={song.path === currentPath}
                    $dragging={isDragging}
                    $dropAbove={dropAbove}
                    $dropBelow={dropBelow}
                    draggable
                    key={song.path ?? `${song.title}-${song.artist}`}
                    onClick={() => setCurrentPath?.(song.path)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenu({ kind: 'queue', x: e.clientX, y: e.clientY, song });
                    }}
                    onDragStart={(e) => {
                      dragFromRef.current = index;
                      setDragFromIndex(index);
                      if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = 'move';
                        // Firefox requires setData for the drag to actually start.
                        e.dataTransfer.setData('text/plain', String(index));
                      }
                    }}
                    onDragOver={(e) => {
                      if (dragFromRef.current === null) return;
                      e.preventDefault();
                      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                      if (dragOverIndex !== index) setDragOverIndex(index);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragFromRef.current;
                      if (from !== null && from !== index) {
                        reorderQueue(from, index);
                      }
                      resetDrag();
                    }}
                    onDragEnd={resetDrag}
                    title={displayTitle(song)}
                  >
                    <AlbumImage metadata={song} height="2.25rem" width="2.25rem" draggable={false} />
                    <span className="sidebar-item-label">{displayTitle(song)}</span>
                  </MenuItem>
                );
              })}
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
      </SidebarContent>
      <ResizeHandle
        role="separator"
        tabIndex={0}
        aria-label="Largura da navegação lateral"
        aria-orientation="vertical"
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={maxWidth}
        aria-valuenow={width}
        aria-valuetext={`${width} pixels`}
        {...handleProps}
      />
    </SidebarContainer>
  );
};

export default Sidebar;
