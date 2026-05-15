import { useContext, useState } from 'react';
import { useNavigate } from 'react-router';
import { FaPlay, FaListUl } from 'react-icons/fa6';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import Count from '../../Components/Count/Count';
import Page from '../../Components/Page/Page';
import PageHeader from '../../Components/PageHeader/PageHeader';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import ContextMenu, { ContextMenuItem } from '../../Components/ContextMenu/ContextMenu';
import { useLazyAlbumArt } from '../../hooks/useLazyAlbumArt';
import { Grid, Card, Avatar, ArtistName, ArtistMeta, AvatarImage } from './styles';

interface ArtistEntry {
  name: string;
  songs: MetadataType[];
  albumCount: number;
  albumArt?: string;
  coverPath?: string;
}

function groupByArtist(library: MetadataType[]): ArtistEntry[] {
  const map = new Map<string, MetadataType[]>();
  for (const song of library) {
    const key = song.artist ?? 'Unknown Artist';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(song);
  }
  return Array.from(map.entries())
    .map(([name, songs]) => ({
      name,
      songs,
      albumCount: new Set(songs.map((s) => s.album ?? 'Unknown Album')).size,
      albumArt: songs.find((s) => s.image)?.image,
      coverPath: songs.find((s) => s.path)?.path,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const ArtistAvatar = ({ artist }: { artist: ArtistEntry }) => {
  const image = useLazyAlbumArt(artist.coverPath, artist.albumArt);
  return <Avatar>{image ? <AvatarImage src={image} alt={artist.name} /> : artist.name.charAt(0).toUpperCase()}</Avatar>;
};

const Artists = () => {
  const { library, isScanning } = useContext(AppContext);
  const navigate = useNavigate();
  const [menu, setMenu] = useState<{ x: number; y: number; artist: ArtistEntry } | null>(null);

  if (isScanning) {
    return <StatusMessage>Scanning music library…</StatusMessage>;
  }

  const artists = groupByArtist(library);

  if (artists.length === 0) {
    return <StatusMessage>No artists found in your music library.</StatusMessage>;
  }

  const artistMenuItems = (artist: ArtistEntry): ContextMenuItem[] => [
    { label: 'Play', icon: <FaPlay />, onSelect: () => {}, disabled: artist.songs.length === 0 },
    { label: 'Add to queue', icon: <FaListUl />, onSelect: () => {}, disabled: artist.songs.length === 0 },
  ];

  return (
    <Page>
      <PageHeader>
        Artists <Count>{artists.length}</Count>
      </PageHeader>
      <Grid>
        {artists.map((artist) => (
          <Card
            key={artist.name}
            onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, artist });
            }}
          >
            <ArtistAvatar artist={artist} />
            <ArtistName title={artist.name}>{artist.name}</ArtistName>
            <ArtistMeta>
              {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
            </ArtistMeta>
          </Card>
        ))}
      </Grid>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={artistMenuItems(menu.artist)} onClose={() => setMenu(null)} />}
    </Page>
  );
};

export default Artists;
