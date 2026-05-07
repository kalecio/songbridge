import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import appLogo from '../../../app-icon.png';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import AlbumImage from '../AlbumImage/AlbumImage';
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
import { displayTitle } from '../../songDisplay';

const Sidebar = () => {
  const [songs, setSongs] = useState<MetadataType[]>([]);
  const metadataCache = useRef(new Map<string, MetadataType>());
  const context = useContext(AppContext);
  const { showQueue, setShowQueue, setCurrentPath, currentPlaylist, playlists, currentPath, library } = context;
  const navigate = useNavigate();
  const location = useLocation();

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
                title={displayTitle(song)}
              >
                <AlbumImage metadata={song} height="2.25rem" width="2.25rem" />
                {displayTitle(song)}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </SidebarContainer>
  );
};

export default Sidebar;
