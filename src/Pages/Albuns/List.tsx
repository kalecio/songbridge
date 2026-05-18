import { useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router';
import { FaPlay, FaListUl, FaPenToSquare } from 'react-icons/fa6';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import AlbumImage from '../../Components/AlbumImage/AlbumImage';
import Count from '../../Components/Count/Count';
import Page from '../../Components/Page/Page';
import PageHeader from '../../Components/PageHeader/PageHeader';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import ContextMenu, { ContextMenuItem } from '../../Components/ContextMenu/ContextMenu';
import EditGroupMetadataModal, {
  GroupEditFields,
} from '../../Components/EditGroupMetadataModal/EditGroupMetadataModal';
import { useQueueActions } from '../../hooks/useQueueActions';
import { useMetadataActions } from '../../hooks/useMetadataActions';
import { Grid, GridItem, Card, ArtWrapper, CardInfo, CardTitle, CardBottom, CardArtist, CardCount } from './styles';

interface AlbumEntry {
  name: string;
  artist?: string;
  year?: string;
  image?: string;
  coverPath?: string;
  songs: MetadataType[];
}

function groupByAlbum(library: MetadataType[]): AlbumEntry[] {
  const map = new Map<string, AlbumEntry>();
  for (const song of library) {
    const key = song.album ?? 'Unknown Album';
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        artist: song.artist,
        year: song.year,
        image: song.image,
        coverPath: song.path,
        songs: [],
      });
    }
    const entry = map.get(key)!;
    entry.songs.push(song);
    if (!entry.image && song.image) entry.image = song.image;
    if (!entry.coverPath && song.path) entry.coverPath = song.path;
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const Albums = () => {
  const { library, isScanning } = useContext(AppContext);
  const navigate = useNavigate();
  const [menu, setMenu] = useState<{ x: number; y: number; album: AlbumEntry } | null>(null);
  const [editAlbum, setEditAlbum] = useState<AlbumEntry | null>(null);
  const { playSongs, addToQueue } = useQueueActions();
  const { batchUpdateSongsMetadata } = useMetadataActions();

  const handleSaveAlbum = useCallback(
    async (fields: GroupEditFields) => {
      if (!editAlbum) return;
      const paths = editAlbum.songs.map((s) => s.path).filter((p): p is string => Boolean(p));
      await batchUpdateSongsMetadata(paths, fields);
    },
    [editAlbum, batchUpdateSongsMetadata],
  );

  if (isScanning) {
    return (
      <Page>
        <StatusMessage>Scanning music library…</StatusMessage>
      </Page>
    );
  }

  const albums = groupByAlbum(library);

  if (albums.length === 0) {
    return (
      <Page>
        <StatusMessage>No albums found in your music library.</StatusMessage>
      </Page>
    );
  }

  const albumMenuItems = (album: AlbumEntry): ContextMenuItem[] => {
    const empty = album.songs.length === 0;
    return [
      { label: 'Play', icon: <FaPlay />, onSelect: () => playSongs(album.songs), disabled: empty },
      { label: 'Add to queue', icon: <FaListUl />, onSelect: () => addToQueue(album.songs), disabled: empty },
      { type: 'divider' },
      {
        label: 'Edit metadata',
        icon: <FaPenToSquare />,
        onSelect: () => {
          setMenu(null);
          setEditAlbum(album);
        },
        disabled: empty,
      },
    ];
  };

  return (
    <Page>
      <PageHeader>
        Albums <Count>{albums.length}</Count>
      </PageHeader>
      <Grid>
        {albums.map((album) => (
          <GridItem
            key={album.name}
            onClick={() => navigate(`/albums/${encodeURIComponent(album.name)}`)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, album });
            }}
          >
            <Card>
              <ArtWrapper>
                <AlbumImage
                  metadata={{ image: album.image, album: album.name, path: album.coverPath }}
                  height="100%"
                  width="100%"
                />
              </ArtWrapper>
            </Card>
            <CardInfo>
              <CardTitle title={album.name}>{album.name}</CardTitle>
              <CardBottom>
                <CardArtist title={album.artist ?? 'Unknown Artist'}>{album.artist ?? 'Unknown Artist'}</CardArtist>
                <CardCount>
                  {album.songs.length} {album.songs.length === 1 ? 'song' : 'songs'}
                </CardCount>
              </CardBottom>
            </CardInfo>
          </GridItem>
        ))}
      </Grid>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={albumMenuItems(menu.album)} onClose={() => setMenu(null)} />}
      <EditGroupMetadataModal
        groupType="album"
        songs={editAlbum?.songs ?? null}
        onClose={() => setEditAlbum(null)}
        onSave={handleSaveAlbum}
      />
    </Page>
  );
};

export default Albums;
