import { useEffect, useState } from 'react';
import Controls from '../Controls/Controls';
import ProgressBar from '../ProgressBar/ProgressBar';
import Song from '../Song/Song';
import Volume from '../Volume/Volume';

import { PlayerContainer, StyledPlayer } from './styles';
import { invoke } from '@tauri-apps/api/core';

interface DurationType {
  duration_seconds?: string;
  duration_formatted?: string;
}
interface MetadataType {
  album?: string;
  artist?: string;
  title?: string;
  year?: string;
  image?: string;
  duration?: DurationType;
}

const Player = () => {
  const [metadata, setMetadata] = useState<MetadataType>({});

  useEffect(() => {
    const getMetadata = async () => {
      const data: MetadataType = await invoke('get_metadata', { path: 'music-files/Polygondwanaland.mp3' });
      setMetadata(data);
      console.log('teste', data);
    };
    getMetadata();
  }, []);

  return (
    <PlayerContainer>
      <ProgressBar progress={70} max={100} />
      <StyledPlayer>
        <Song
          albumImage={metadata?.image}
          albumName={metadata?.album}
          songName={metadata?.title ?? 'no name'}
          artistName={metadata?.artist ?? 'no name'}
        />
        <Controls />
        <Volume />
      </StyledPlayer>
    </PlayerContainer>
  );
};

export default Player;
