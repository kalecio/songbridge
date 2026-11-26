import { useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { FaPlay, FaListUl, FaPenToSquare } from 'react-icons/fa6';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import Count from '../../Components/Count/Count';
import Page from '../../Components/Page/Page';
import PageHeader from '../../Components/PageHeader/PageHeader';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import ContextMenu, { ContextMenuItem } from '../../Components/ContextMenu/ContextMenu';
import EditGroupMetadataModal, {
  GroupEditFields,
} from '../../Components/EditGroupMetadataModal/EditGroupMetadataModal';
import { useLazyAlbumArt } from '../../hooks/useLazyAlbumArt';
import { useQueueActions } from '../../hooks/useQueueActions';
import { useMetadataActions } from '../../hooks/useMetadataActions';
import { splitArtists } from '../../utils/artistUtils';
import { useI18n } from '../../i18n/I18nProvider';
import SongSortControl from '../../Components/SongSortControl/SongSortControl';
import type { SongSortDirection } from '../../hooks/useSongSort';
import VirtualizedGrid from '../../Components/VirtualizedGrid/VirtualizedGrid';
import { Card, Avatar, ArtistName, ArtistMeta, AvatarImage, ArtistSortRow } from './styles';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

interface ArtistEntry {
  name: string;
  songs: MetadataType[];
  albumCount: number;
  albumArt?: string;
  coverPath?: string;
}

function groupByArtist(library: MetadataType[]): ArtistEntry[] {
  const map = new Map<string, { songs: MetadataType[]; albums: Set<string>; albumArt?: string; coverPath?: string }>();
  for (const song of library) {
    const artists = splitArtists(song.artist ?? 'Unknown Artist');
    for (const artist of artists) {
      let entry = map.get(artist);
      if (!entry) {
        entry = { songs: [], albums: new Set<string>() };
        map.set(artist, entry);
      }
      entry.songs.push(song);
      entry.albums.add(song.album ?? 'Unknown Album');
      if (!entry.albumArt && song.image) entry.albumArt = song.image;
      if (!entry.coverPath && song.path) entry.coverPath = song.path;
    }
  }
  return Array.from(map.entries())
    .map(([name, entry]) => ({
      name,
      songs: entry.songs,
      albumCount: entry.albums.size,
      albumArt: entry.albumArt,
      coverPath: entry.coverPath,
    }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

const ArtistAvatar = ({ artist }: { artist: ArtistEntry }) => {
  const image = useLazyAlbumArt(artist.coverPath, artist.albumArt);
  return <Avatar>{image ? <AvatarImage src={image} alt={artist.name} /> : artist.name.charAt(0).toUpperCase()}</Avatar>;
};

const Artists = () => {
  const { t } = useI18n();
  const { library, isScanning } = useContext(AppContext);
  const navigate = useNavigate();
  const [menu, setMenu] = useState<{ x: number; y: number; artist: ArtistEntry } | null>(null);
  const [editArtist, setEditArtist] = useState<ArtistEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<SongSortDirection>('asc');
  const { playSongs, addToQueue } = useQueueActions();
  const { batchUpdateSongsMetadata } = useMetadataActions();

  const handleSaveArtist = useCallback(
    async (fields: GroupEditFields) => {
      if (!editArtist) return;
      const paths = editArtist.songs.map((s) => s.path).filter((p): p is string => Boolean(p));
      await batchUpdateSongsMetadata(paths, fields);
    },
    [editArtist, batchUpdateSongsMetadata],
  );

  const artists = useMemo(() => {
    const grouped = groupByArtist(library);
    return sortDirection === 'asc' ? grouped : grouped.reverse();
  }, [library, sortDirection]);

  if (isScanning) {
    return <StatusMessage>{t('album.scanning')}</StatusMessage>;
  }

  if (artists.length === 0) {
    return <StatusMessage>{t('artist.noArtists')}</StatusMessage>;
  }

  const artistMenuItems = (artist: ArtistEntry): ContextMenuItem[] => {
    const empty = artist.songs.length === 0;
    return [
      { label: t('common.play'), icon: <FaPlay />, onSelect: () => playSongs(artist.songs), disabled: empty },
      { label: t('common.addToQueue'), icon: <FaListUl />, onSelect: () => addToQueue(artist.songs), disabled: empty },
      { type: 'divider' },
      {
        label: t('common.editMetadata'),
        icon: <FaPenToSquare />,
        onSelect: () => {
          setMenu(null);
          setEditArtist(artist);
        },
        disabled: empty,
      },
    ];
  };

  return (
    <Page>
      <PageHeader>
        {t('sidebar.artists')} <Count>{artists.length}</Count>
      </PageHeader>
      {artists.length > 1 && (
        <ArtistSortRow>
          <SongSortControl
            sortField="artist"
            sortDirection={sortDirection}
            sortFields={['artist']}
            includeOriginalOrder={false}
            onSortFieldChange={() => {}}
            onSortDirectionChange={setSortDirection}
          />
        </ArtistSortRow>
      )}
      <VirtualizedGrid
        items={artists}
        getItemKey={(artist) => artist.name}
        renderItem={(artist) => (
          <Card
            onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, artist });
            }}
          >
            <ArtistAvatar artist={artist} />
            <ArtistName hoverOnly title={artist.name}>
              {artist.name}
            </ArtistName>
            <ArtistMeta>
              {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
            </ArtistMeta>
          </Card>
        )}
      />
      {menu && <ContextMenu x={menu.x} y={menu.y} items={artistMenuItems(menu.artist)} onClose={() => setMenu(null)} />}
      <EditGroupMetadataModal
        groupType="artist"
        songs={editArtist?.songs ?? null}
        onClose={() => setEditArtist(null)}
        onSave={handleSaveArtist}
      />
    </Page>
  );
};

export default Artists;
