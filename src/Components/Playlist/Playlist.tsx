import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MetadataType } from '../../types';
import AlbumImage from '../AlbumImage/AlbumImage';
import {
  PlaylistContainer,
  Header,
  PlaylistInfo,
  PlaylistDetails,
  PlayNowButton,
  Type,
  PlaylistName,
  SongsQuantity,
  Play,
  SongList,
  SongItem,
  SongInfo,
  SongTitle,
  SongArtist,
  SongDuration,
  MissingIcon,
  RemoveMissingButton,
  RemoveMissingIcon,
} from './styles';

interface Props {
  songs: MetadataType[];
  name: string;
  type?: string;
  activePath?: string;
  scroll?: boolean;
  onSongClick?: (_song: MetadataType) => void;
  onPlayAll?: () => void;
  onRemoveMissing?: (_song: MetadataType) => void;
}

const Playlist = ({
  songs,
  name,
  type = 'Playlist',
  activePath,
  scroll = true,
  onSongClick,
  onPlayAll,
  onRemoveMissing,
}: Props) => {
  const [missingPaths, setMissingPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    const paths = songs.map((s) => s.path).filter((p): p is string => Boolean(p));
    if (paths.length === 0) return;

    invoke<string[]>('check_paths_exist', { paths })
      .then((missing) => setMissingPaths(new Set(missing)))
      .catch(() => {});
  }, [songs]);

  return (
    <PlaylistContainer $scroll={scroll}>
      <Header>
        <PlaylistInfo>
          {type !== 'Library' && <AlbumImage metadata={songs[0]} height="10rem" width="10rem" />}
          <PlaylistDetails>
            <Type>{type}</Type>
            <PlaylistName>{name}</PlaylistName>
            <SongsQuantity>{songs.length} songs</SongsQuantity>
            <PlayNowButton onClick={onPlayAll}>
              <Play /> Play Now
            </PlayNowButton>
          </PlaylistDetails>
        </PlaylistInfo>
      </Header>
      <SongList $scroll={scroll}>
        {songs.map((song, index) => {
          const isMissing = Boolean(song.path && missingPaths.has(song.path));
          return (
            <SongItem
              key={song.path ?? index}
              $active={song.path === activePath}
              $missing={isMissing}
              onClick={() => !isMissing && onSongClick?.(song)}
            >
              <AlbumImage metadata={song} height="3rem" width="3rem" />
              <SongInfo>
                <SongTitle>{song.title}</SongTitle>
                <SongArtist>{song.artist}</SongArtist>
              </SongInfo>
              {isMissing ? (
                <>
                  <MissingIcon title="File not found on disk" />
                  {onRemoveMissing && (
                    <RemoveMissingButton
                      aria-label={`Remove missing track ${song.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveMissing(song);
                      }}
                    >
                      <RemoveMissingIcon />
                    </RemoveMissingButton>
                  )}
                </>
              ) : (
                <SongDuration>{song.duration?.duration_formatted}</SongDuration>
              )}
            </SongItem>
          );
        })}
      </SongList>
    </PlaylistContainer>
  );
};

export default Playlist;
