import { useContext } from 'react';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import Playlist from '../../Components/Playlist/Playlist';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';

const Songs = () => {
  const { library, isScanning, currentPath, setCurrentPath, setCurrentPlaylist } = useContext(AppContext);

  if (isScanning) {
    return <StatusMessage>Scanning music library…</StatusMessage>;
  }

  if (library.length === 0) {
    return <StatusMessage>No songs found in your music library.</StatusMessage>;
  }

  const playSong = (song: MetadataType) => {
    const paths = library.map((s) => s.path).filter((p): p is string => Boolean(p));
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(song.path);
  };

  return (
    <Playlist
      songs={library}
      name="Songs"
      type="Library"
      activePath={currentPath}
      onSongClick={playSong}
      onPlayAll={() => library[0] && playSong(library[0])}
    />
  );
};

export default Songs;
