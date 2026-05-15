import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FaPlay, FaListUl, FaTrash } from 'react-icons/fa6';
import { MetadataType } from '../../types';
import { displayTitle } from '../../songDisplay';
import { useQueueActions } from '../../hooks/useQueueActions';
import { useAddToPlaylistMenu } from '../../hooks/useAddToPlaylistMenu';
import AlbumImage from '../AlbumImage/AlbumImage';
import ContextMenu, { ContextMenuItem } from '../ContextMenu/ContextMenu';
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
  onRemoveSong?: (_song: MetadataType) => void;
  /** When provided, song rows become draggable to reorder. `to` is the index
   * the dragged item should end up at after the move. */
  onReorder?: (_fromIndex: number, _toIndex: number) => void;
}

// Above this list size we switch to windowed rendering. Album / playlist
// detail pages stay below this threshold and keep the simple flex layout
// so unit tests (which run in a zero-height JSDOM viewport where the
// virtualizer can't measure anything) keep working as before.
const VIRTUALIZE_THRESHOLD = 100;
// Approximate row height (3rem image + 0.75rem*2 padding + 1rem gap ≈ 80px).
const ROW_HEIGHT = 80;

const Playlist = ({
  songs,
  name,
  type = 'Playlist',
  activePath,
  scroll = true,
  onSongClick,
  onPlayAll,
  onRemoveMissing,
  onRemoveSong,
  onReorder,
}: Props) => {
  const [missingPaths, setMissingPaths] = useState<Set<string>>(new Set());
  const [menuState, setMenuState] = useState<{ x: number; y: number; song: MetadataType } | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const { playNext, addToQueue } = useQueueActions();
  const buildAddToPlaylistItem = useAddToPlaylistMenu();

  useEffect(() => {
    const paths = songs.map((s) => s.path).filter((p): p is string => Boolean(p));
    if (paths.length === 0) return;

    invoke<string[]>('check_paths_exist', { paths })
      .then((missing) => setMissingPaths(new Set(missing)))
      .catch(() => {});
  }, [songs]);

  const resetDrag = () => {
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const renderRow = (song: MetadataType, key: string | number, index: number) => {
    const isMissing = Boolean(song.path && missingPaths.has(song.path));
    const title = displayTitle(song);
    const reorderable = Boolean(onReorder);
    const isDragging = reorderable && dragFromIndex === index;
    const showIndicator = reorderable && dragFromIndex !== null && dragOverIndex === index && dragFromIndex !== index;
    const dropAbove = showIndicator && (dragFromIndex as number) > index;
    const dropBelow = showIndicator && (dragFromIndex as number) < index;

    return (
      <SongItem
        key={key}
        $active={song.path === activePath}
        $missing={isMissing}
        $dragging={isDragging}
        $dropAbove={dropAbove}
        $dropBelow={dropBelow}
        draggable={reorderable || undefined}
        onClick={() => !isMissing && onSongClick?.(song)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuState({ x: e.clientX, y: e.clientY, song });
        }}
        onDragStart={
          reorderable
            ? (e) => {
                setDragFromIndex(index);
                if (e.dataTransfer) {
                  e.dataTransfer.effectAllowed = 'move';
                  // Firefox requires setData for the drag to actually start.
                  e.dataTransfer.setData('text/plain', String(index));
                }
              }
            : undefined
        }
        onDragOver={
          reorderable
            ? (e) => {
                if (dragFromIndex === null) return;
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                if (dragOverIndex !== index) setDragOverIndex(index);
              }
            : undefined
        }
        onDrop={
          reorderable
            ? (e) => {
                e.preventDefault();
                if (dragFromIndex !== null && dragFromIndex !== index) {
                  onReorder?.(dragFromIndex, index);
                }
                resetDrag();
              }
            : undefined
        }
        onDragEnd={reorderable ? resetDrag : undefined}
      >
        <AlbumImage metadata={song} height="3rem" width="3rem" draggable={reorderable ? false : undefined} />
        <SongInfo>
          <SongTitle title={title}>{title}</SongTitle>
          <SongArtist title={song.artist}>{song.artist}</SongArtist>
        </SongInfo>
        {isMissing ? (
          <>
            <MissingIcon title="File not found on disk" />
            {onRemoveMissing && (
              <RemoveMissingButton
                aria-label={`Remove missing track ${title}`}
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
  };

  // DnD relies on every drop target being mounted; virtualization can unmount
  // rows the user is dragging toward, so we disable it when reorder is wired.
  const useVirtualization = scroll && songs.length > VIRTUALIZE_THRESHOLD && !onReorder;

  const menuItems = (song: MetadataType): ContextMenuItem[] => {
    const isMissing = Boolean(song.path && missingPaths.has(song.path));
    const items: ContextMenuItem[] = [
      { label: 'Play next', icon: <FaPlay />, onSelect: () => playNext(song), disabled: isMissing },
      { label: 'Add to queue', icon: <FaListUl />, onSelect: () => addToQueue([song]), disabled: isMissing },
      buildAddToPlaylistItem(song),
    ];
    if (onRemoveSong) {
      items.push(
        { type: 'divider' },
        { label: 'Remove from playlist', icon: <FaTrash />, onSelect: () => onRemoveSong(song), danger: true },
      );
    }
    return items;
  };

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
      {useVirtualization ? (
        <VirtualSongList songs={songs} renderRow={renderRow} />
      ) : (
        <SongList $scroll={scroll}>{songs.map((song, index) => renderRow(song, song.path ?? index, index))}</SongList>
      )}
      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={menuItems(menuState.song)}
          onClose={() => setMenuState(null)}
        />
      )}
    </PlaylistContainer>
  );
};

const VirtualSongList = ({
  songs,
  renderRow,
}: {
  songs: MetadataType[];
  renderRow: (_song: MetadataType, _key: string | number, _index: number) => React.ReactNode;
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => songs[index].path ?? index,
  });

  return (
    <SongList ref={parentRef} $scroll>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const song = songs[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow(song, String(virtualRow.key), virtualRow.index)}
            </div>
          );
        })}
      </div>
    </SongList>
  );
};

export default Playlist;
