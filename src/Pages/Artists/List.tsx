import { useContext } from 'react';
import { useNavigate } from 'react-router';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import Count from '../../Components/Count/Count';
import Page from '../../Components/Page/Page';
import PageHeader from '../../Components/PageHeader/PageHeader';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import { Grid, Card, Avatar, ArtistName, ArtistMeta } from './styles';

interface ArtistEntry {
  name: string;
  songs: MetadataType[];
  albumCount: number;
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
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const Artists = () => {
  const { library, isScanning } = useContext(AppContext);
  const navigate = useNavigate();

  if (isScanning) {
    return <StatusMessage>Scanning music library…</StatusMessage>;
  }

  const artists = groupByArtist(library);

  if (artists.length === 0) {
    return <StatusMessage>No artists found in your music library.</StatusMessage>;
  }

  return (
    <Page>
      <PageHeader>
        Artists <Count>{artists.length}</Count>
      </PageHeader>
      <Grid>
        {artists.map((artist) => (
          <Card key={artist.name} onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}>
            <Avatar>{artist.name.charAt(0).toUpperCase()}</Avatar>
            <ArtistName>{artist.name}</ArtistName>
            <ArtistMeta>
              {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
            </ArtistMeta>
          </Card>
        ))}
      </Grid>
    </Page>
  );
};

export default Artists;
