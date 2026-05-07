import { useContext } from 'react';
import { useNavigate } from 'react-router';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import AlbumImage from '../../Components/AlbumImage/AlbumImage';
import Count from '../../Components/Count/Count';
import Page from '../../Components/Page/Page';
import PageHeader from '../../Components/PageHeader/PageHeader';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
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

  return (
    <Page>
      <PageHeader>
        Albums <Count>{albums.length}</Count>
      </PageHeader>
      <Grid>
        {albums.map((album) => (
          <GridItem key={album.name} onClick={() => navigate(`/albums/${encodeURIComponent(album.name)}`)}>
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
              <CardTitle>{album.name}</CardTitle>
              <CardBottom>
                <CardArtist>{album.artist ?? 'Unknown Artist'}</CardArtist>
                <CardCount>
                  {album.songs.length} {album.songs.length === 1 ? 'song' : 'songs'}
                </CardCount>
              </CardBottom>
            </CardInfo>
          </GridItem>
        ))}
      </Grid>
    </Page>
  );
};

export default Albums;
