import { useContext } from 'react';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import Playlist from '../../Components/Playlist/Playlist';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import { useI18n } from '../../i18n/I18nProvider';

const Songs = () => {
  const { t } = useI18n();
  const { library, isScanning, currentPath, setCurrentPath, setCurrentPlaylist } = useContext(AppContext);

  if (isScanning) {
    return <StatusMessage>{t('song.scanning')}</StatusMessage>;
  }

  if (library.length === 0) {
    return <StatusMessage>{t('song.noSongs')}</StatusMessage>;
  }

  const playSong = (song: MetadataType, orderedSongs: MetadataType[] = library) => {
    const paths = orderedSongs.map((s) => s.path).filter((p): p is string => Boolean(p));
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(song.path);
  };

  return (
    <Playlist
      songs={library}
      name={t('sidebar.songs')}
      type={t('sidebar.library')}
      defaultSort="title"
      activePath={currentPath}
      onSongClick={playSong}
      onPlayAll={(orderedSongs) => {
        const list = orderedSongs ?? library;
        if (list[0]) playSong(list[0], list);
      }}
    />
  );
};

export default Songs;
