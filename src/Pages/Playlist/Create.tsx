import { useContext, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { MetadataType, PlaylistType } from '../../types';
import { isFavouritesPlaylist, sortFavouritesFirst } from '../../hooks/useFavourites';
import { displayTitle } from '../../songDisplay';
import {
  AddIcon,
  Column,
  ColumnTitle,
  Container,
  DeleteBtn,
  EditorHeader,
  EmptyColumn,
  EmptyState,
  FavouriteBadge,
  IconButton,
  LeftPanel,
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

const CreatePlaylist = () => {
  const { playlists = [], setPlaylists, library } = useContext(AppContext);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [search, setSearch] = useState('');

  const selected = playlists.find((p) => p.id === selectedId) ?? null;

  const select = (pl: PlaylistType) => {
    setSelectedId(pl.id);
    setEditingName(pl.name);
    setSearch('');
  };

  const updatePlaylists = (updated: PlaylistType) =>
    setPlaylists?.(playlists.map((p) => (p.id === updated.id ? updated : p)));

  const handleNew = () => {
    const id = crypto.randomUUID();
    const name = 'New Playlist';
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
    await invoke('db_delete_playlist', { id }).catch(() => {});
    setPlaylists?.(playlists.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleAddSong = (song: MetadataType) => {
    if (!selected || selected.songs.some((s) => s.path === song.path)) return;
    updatePlaylists({ ...selected, songs: [...selected.songs, song] });
  };

  const handleRemoveSong = (path: string) => {
    if (!selected) return;
    updatePlaylists({ ...selected, songs: selected.songs.filter((s) => s.path !== path) });
  };

  const filtered = library.filter(
    (s) =>
      !selected?.songs.some((ps) => ps.path === s.path) &&
      (search === '' ||
        s.title?.toLowerCase().includes(search.toLowerCase()) ||
        s.artist?.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <Container>
      <LeftPanel>
        <NewButton onClick={handleNew}>+ New Playlist</NewButton>
        {sortFavouritesFirst(playlists).map((pl) => {
          const fav = isFavouritesPlaylist(pl.id);
          return (
            <PlaylistItem key={pl.id} $active={pl.id === selectedId} onClick={() => select(pl)}>
              <PlaylistItemInfo>
                <PlaylistItemName>
                  {fav && <FavouriteBadge aria-hidden="true" />}
                  {pl.name}
                </PlaylistItemName>
                <PlaylistItemCount>{pl.songs.length} songs</PlaylistItemCount>
              </PlaylistItemInfo>
              {!fav && (
                <DeleteBtn
                  aria-label={`Delete ${pl.name}`}
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
        {playlists.length === 0 && <EmptyColumn style={{ padding: '0 0.75rem' }}>No playlists yet</EmptyColumn>}
      </LeftPanel>

      <RightPanel>
        {!selected ? (
          <EmptyState>Select a playlist on the left or create a new one</EmptyState>
        ) : (
          <>
            <EditorHeader>
              <NameInput
                aria-label="Playlist name"
                value={editingName}
                readOnly={isFavouritesPlaylist(selected.id)}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
              <SongCount>{selected.songs.length} songs</SongCount>
            </EditorHeader>

            <TwoColumn>
              <Column>
                <ColumnTitle>In playlist</ColumnTitle>
                <SongScroll>
                  {selected.songs.length === 0 ? (
                    <EmptyColumn>Add songs from your library →</EmptyColumn>
                  ) : (
                    selected.songs.map((song) => {
                      const title = displayTitle(song);
                      return (
                        <SongRow key={song.path}>
                          <SongMeta>
                            <SongTitle title={title}>{title}</SongTitle>
                            <SongArtist>{song.artist}</SongArtist>
                          </SongMeta>
                          <IconButton aria-label={`Remove ${title}`} onClick={() => handleRemoveSong(song.path!)}>
                            <RemoveIcon />
                          </IconButton>
                        </SongRow>
                      );
                    })
                  )}
                </SongScroll>
              </Column>

              <Column>
                <ColumnTitle>Library</ColumnTitle>
                <SearchInput placeholder="Search songs…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <SongScroll>
                  {filtered.length === 0 ? (
                    <EmptyColumn>{search ? 'No matches' : 'All library songs are in this playlist'}</EmptyColumn>
                  ) : (
                    filtered.map((song) => {
                      const title = displayTitle(song);
                      return (
                        <SongRow key={song.path} onClick={() => handleAddSong(song)} style={{ cursor: 'pointer' }}>
                          <SongMeta>
                            <SongTitle title={title}>{title}</SongTitle>
                            <SongArtist>{song.artist}</SongArtist>
                          </SongMeta>
                          <IconButton as="span" aria-hidden>
                            <AddIcon />
                          </IconButton>
                        </SongRow>
                      );
                    })
                  )}
                </SongScroll>
              </Column>
            </TwoColumn>
          </>
        )}
      </RightPanel>
    </Container>
  );
};

export default CreatePlaylist;
