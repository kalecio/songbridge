import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../Context/AppContext';
import { SidebarContainer, Menu, MenuItem, Title, PlusButtonContainer, PlusIcon, BackIcon } from './styles';
import { invoke } from '@tauri-apps/api/core';
import { MetadataType } from '../../types';
import AlbumImage from '../AlbumImage/AlbumImage';
import { useNavigate } from 'react-router';

const Sidebar = () => {
  const [songs, setSongs] = useState<MetadataType[]>([]);
  const context = useContext(AppContext);
  const { showQueue, setShowQueue, setCurrentPath, currentPlaylist, playlists } = context;
  const navigate = useNavigate();

  useEffect(() => {
    const getSongs = async () => {
      const songsMetadatas = await Promise.all(
        currentPlaylist.map(async (path) => {
          const metadata = await invoke<MetadataType>('get_metadata', { path });
          return { ...metadata, path };
        }),
      );
      console.log('Songs metadata in sidebar:', songsMetadatas);
      setSongs(songsMetadatas);
    };
    getSongs();
  }, [currentPlaylist]);

  return (
    <SidebarContainer>
      {!showQueue && (
        <>
          <Header>Menu</Header>
          <Menu>
            <MenuItem onClick={() => navigate('/')}>Home</MenuItem>
            <MenuItem onClick={() => navigate('/artists')}>Artists</MenuItem>
            <MenuItem onClick={() => navigate('/albums')}>Albums</MenuItem>
            <MenuItem onClick={() => navigate('/songs')}>Songs</MenuItem>
          </Menu>
          <Header onClick={() => navigate('/playlist')}>Playlists</Header>
          <Menu>
            {songs.length > 0 && <MenuItem onClick={() => setShowQueue?.(true)}>Playing now</MenuItem>}
            {playlists &&
              playlists.map((playlist) => (
                <MenuItem key={playlist.id} onClick={() => navigate(`/playlist/${playlist.id}`)}>
                  {playlist.name}
                </MenuItem>
              ))}
          </Menu>
        </>
      )}
      {/* abstrair para componente queue */}
      {showQueue && (
        <>
          <Header variant="back" onClick={() => setShowQueue?.(false)}></Header>
          <Menu>
            {songs.map((song) => {
              return (
                <MenuItem key={`${song.title}-${song.artist}`} onClick={() => setCurrentPath?.(song.path)}>
                  <AlbumImage metadata={song} height="2.5rem" width="2.5rem" /> {song.title}
                </MenuItem>
              );
            })}
          </Menu>
        </>
      )}
    </SidebarContainer>
  );
};

const Header = ({
  children,
  onClick,
  variant,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: string;
}) => {
  return (
    <Title>
      {children && <span>{children}</span>} {onClick && <IconButton onClick={onClick} variant={variant} />}
    </Title>
  );
};

const IconButton = ({ onClick, variant }: { onClick?: () => void; variant?: string }) => {
  return (
    <PlusButtonContainer onClick={onClick}>{variant === 'back' ? <BackIcon /> : <PlusIcon />}</PlusButtonContainer>
  );
};

export default Sidebar;
