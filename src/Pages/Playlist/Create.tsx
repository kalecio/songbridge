import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AppContext } from '../../Context/AppContext';
import { MetadataType, PlaylistType } from '../../types';
import { isFavouritesPlaylist, sortFavouritesFirst } from '../../hooks/useFavourites';
import { displayTitle } from '../../songDisplay';
import { useI18n } from '../../i18n/I18nProvider';
import { useSongSort } from '../../hooks/useSongSort';
import SongSortControl from '../../Components/SongSortControl/SongSortControl';
import {
  AddIcon,
  AsideResizeHandle,
  Column,
  ColumnHeader,
  ColumnTitle,
  Container,
  DeleteBtn,
  EditorHeader,
  EmptyColumn,
  EmptyState,
  FavouriteBadge,
  IconButton,
  LeftPanel,
  LeftPanelContent,
  PlaylistDeleteError,
  NameInput,
  NewButton,
  PlaylistItem,
  PlaylistItemCount,
  PlaylistItemInfo,
  PlaylistItemName,
  RemoveIcon,
  RightPanel,
  SearchInput,
  SongArtist,
  SongCount,
  SongMeta,
  SongRow,
  SongScroll,
  SongTitle,
  TrashIcon,
  TwoColumn,
} from './styles';
import TextMarquee from '../../Components/TextMarquee/TextMarquee';
import { usePlaylistAsideWidth } from './usePlaylistAsideWidth';

const VIRTUALIZE_LIBRARY_THRESHOLD = 100;

const CreatePlaylist = () => {
  const { t, tc } = useI18n();
  const { playlists = [], setPlaylists, library } = useContext(AppContext);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [search, setSearch] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const preAddedRef = useRef(false);
  const aside = usePlaylistAsideWidth();

  // When arriving via "Add to playlist → Create new playlist", router state
  // carries the song. Create a fresh playlist that already contains it, then
  // clear the state so a reload doesn't re-create.
  useEffect(() => {
    const state = location.state as { addSong?: MetadataType } | null;
    const seed = state?.addSong;
    if (!seed || preAddedRef.current) return;
    preAddedRef.current = true;
    const id = crypto.randomUUID();
    const pl: PlaylistType = { id, name: t('playlist.new').replace(/^\+\s*/, ''), songs: seed.path ? [seed] : [] };
    setPlaylists?.((prev) => [...prev, pl]);
    setSelectedId(pl.id);
    setEditingName(pl.name);
    navigate(location.pathname, { replace: true });
  }, [location.state, location.pathname, navigate, setPlaylists, t]);

  const selected = playlists.find((p) => p.id === selectedId) ?? null;
  const selectedSongSort = useSongSort(selected?.songs ?? []);

  const select = (pl: PlaylistType) => {
    setSelectedId(pl.id);
    setEditingName(pl.name);
    setSearch('');
  };

  const updatePlaylists = (updated: PlaylistType) =>
    setPlaylists?.(playlists.map((p) => (p.id === updated.id ? updated : p)));

  const handleNew = () => {
    const id = crypto.randomUUID();
    const name = t('playlist.new').replace(/^\+\s*/, '');
    const pl: PlaylistType = { id, name, songs: [] };
    setPlaylists?.([...playlists, pl]);
    select(pl);
  };

  const handleRename = () => {
    if (!selected) return;
    if (isFavouritesPlaylist(selected.id)) return;
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === selected.name) return;
    updatePlaylists({ ...selected, name: trimmed });
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeleteError('');
    setDeletingId(id);
    try {
      await invoke('db_delete_playlist', { id });
      setPlaylists?.((previous) => previous.filter((playlist) => playlist.id !== id));
      setSelectedId((current) => (current === id ? null : current));
    } catch (error) {
      setDeleteError(t('playlist.deleteFailed', { error: String(error) }));
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddSong = (song: MetadataType) => {
    if (!selected || selected.songs.some((s) => s.path === song.path)) return;
    updatePlaylists({ ...selected, songs: [...selected.songs, song] });
  };

  const handleRemoveSong = (path: string) => {
    if (!selected) return;
    updatePlaylists({ ...selected, songs: selected.songs.filter((s) => s.path !== path) });
  };

  const selectedPaths = useMemo(() => new Set(selected?.songs.map((song) => song.path)), [selected?.songs]);
  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      library.filter(
        (song) =>
          !selectedPaths.has(song.path) &&
          (query === '' || song.title?.toLowerCase().includes(query) || song.artist?.toLowerCase().includes(query)),
      ),
    [library, query, selectedPaths],
  );
  const librarySongSort = useSongSort(filtered, 'title');

  return (
    <Container>
      <LeftPanel $width={aside.width} $resizing={aside.isResizing}>
        <LeftPanelContent>
          <NewButton onClick={handleNew}>{t('playlist.new')}</NewButton>
          {deleteError && <PlaylistDeleteError role="alert">{deleteError}</PlaylistDeleteError>}
          {sortFavouritesFirst(playlists).map((pl) => {
            const fav = isFavouritesPlaylist(pl.id);
            return (
              <PlaylistItem key={pl.id} $active={pl.id === selectedId} onClick={() => select(pl)}>
                <PlaylistItemInfo>
                  <PlaylistItemName>
                    {fav && <FavouriteBadge aria-hidden="true" />}
                    <TextMarquee title={pl.name}>{pl.name}</TextMarquee>
                  </PlaylistItemName>
                  <PlaylistItemCount>{tc('count.song', pl.songs.length)}</PlaylistItemCount>
                </PlaylistItemInfo>
                {!fav && (
                  <DeleteBtn
                    aria-label={t('playlist.deleteNamed', { name: pl.name })}
                    disabled={deletingId !== null}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(pl.id);
                    }}
                  >
                    <TrashIcon />
                  </DeleteBtn>
                )}
              </PlaylistItem>
            );
          })}
          {playlists.length === 0 && <EmptyColumn style={{ padding: '0 0.75rem' }}>{t('playlist.none')}</EmptyColumn>}
        </LeftPanelContent>
        <AsideResizeHandle
          {...aside.handleProps}
          role="separator"
          aria-orientation="vertical"
          aria-label={t('sidebar.width')}
          aria-valuemin={210}
          aria-valuemax={aside.maxWidth}
          aria-valuenow={aside.width}
          aria-valuetext={t('sidebar.widthPixels', { width: aside.width })}
          tabIndex={0}
        />
      </LeftPanel>

      <RightPanel>
        {!selected ? (
          <EmptyState>{t('playlist.selectOrCreate')}</EmptyState>
        ) : (
          <>
            <EditorHeader>
              <NameInput
                aria-label={t('playlist.name')}
                value={editingName}
                readOnly={isFavouritesPlaylist(selected.id)}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
              <SongCount>{tc('count.song', selected.songs.length)}</SongCount>
            </EditorHeader>

            <TwoColumn>
              <Column>
                <ColumnHeader>
                  <ColumnTitle>{t('playlist.inPlaylist')}</ColumnTitle>
                  {selectedSongSort.sortedSongs.length > 1 && (
                    <SongSortControl
                      sortField={selectedSongSort.sortField}
                      sortDirection={selectedSongSort.sortDirection}
                      onSortFieldChange={selectedSongSort.setSortField}
                      onSortDirectionChange={selectedSongSort.setSortDirection}
                    />
                  )}
                </ColumnHeader>
                <SongScroll>
                  {selected.songs.length === 0 ? (
                    <EmptyColumn>{t('playlist.addFromLibrary')}</EmptyColumn>
                  ) : (
                    selectedSongSort.sortedSongs.map((song) => {
                      const title = displayTitle(song);
                      return (
                        <SongRow key={song.path}>
                          <SongMeta>
                            <SongTitle title={title}>{title}</SongTitle>
                            <SongArtist>{song.artist}</SongArtist>
                          </SongMeta>
                          <IconButton
                            aria-label={t('playlist.removeSong', { title })}
                            onClick={() => handleRemoveSong(song.path!)}
                          >
                            <RemoveIcon />
                          </IconButton>
                        </SongRow>
                      );
                    })
                  )}
                </SongScroll>
              </Column>

              <Column>
                <ColumnHeader>
                  <ColumnTitle>{t('playlist.library')}</ColumnTitle>
                  {librarySongSort.sortedSongs.length > 1 && (
                    <SongSortControl
                      sortField={librarySongSort.sortField}
                      sortDirection={librarySongSort.sortDirection}
                      onSortFieldChange={librarySongSort.setSortField}
                      onSortDirectionChange={librarySongSort.setSortDirection}
                    />
                  )}
                </ColumnHeader>
                <SearchInput
                  placeholder={t('playlist.searchSongs')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <VirtualLibraryList
                  songs={librarySongSort.sortedSongs}
                  emptyMessage={search ? t('playlist.noMatches') : t('playlist.allSongsAdded')}
                  onAddSong={handleAddSong}
                />
              </Column>
            </TwoColumn>
          </>
        )}
      </RightPanel>
    </Container>
  );
};

const LibrarySongRow = ({ song, onAddSong }: { song: MetadataType; onAddSong: (_song: MetadataType) => void }) => {
  const title = displayTitle(song);
  return (
    <SongRow onClick={() => onAddSong(song)} style={{ cursor: 'pointer' }}>
      <SongMeta>
        <SongTitle title={title}>{title}</SongTitle>
        <SongArtist title={song.artist}>{song.artist}</SongArtist>
      </SongMeta>
      <IconButton as="span" aria-hidden>
        <AddIcon />
      </IconButton>
    </SongRow>
  );
};

const VirtualLibraryList = ({
  songs,
  emptyMessage,
  onAddSong,
}: {
  songs: MetadataType[];
  emptyMessage: string;
  onAddSong: (_song: MetadataType) => void;
}) => {
  if (songs.length <= VIRTUALIZE_LIBRARY_THRESHOLD) {
    return (
      <SongScroll>
        {songs.length === 0 ? (
          <EmptyColumn>{emptyMessage}</EmptyColumn>
        ) : (
          songs.map((song, index) => <LibrarySongRow key={song.path ?? index} song={song} onAddSong={onAddSong} />)
        )}
      </SongScroll>
    );
  }

  return <VirtualizedLibraryList songs={songs} emptyMessage={emptyMessage} onAddSong={onAddSong} />;
};

const VirtualizedLibraryList = ({
  songs,
  emptyMessage,
  onAddSong,
}: {
  songs: MetadataType[];
  emptyMessage: string;
  onAddSong: (_song: MetadataType) => void;
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 8,
    getItemKey: (index) => songs[index].path ?? index,
  });

  return (
    <SongScroll ref={parentRef}>
      {songs.length === 0 ? (
        <EmptyColumn>{emptyMessage}</EmptyColumn>
      ) : (
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const song = songs[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <LibrarySongRow song={song} onAddSong={onAddSong} />
              </div>
            );
          })}
        </div>
      )}
    </SongScroll>
  );
};

export default CreatePlaylist;
