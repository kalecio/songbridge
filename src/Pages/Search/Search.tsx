import { useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { AppContext } from '../../Context/AppContext';
import { MetadataType } from '../../types';
import AlbumImage from '../../Components/AlbumImage/AlbumImage';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import {
  SearchContainer,
  ResultsSection,
  SectionTitle,
  SongRow,
  SongInfo,
  SongTitle,
  SongArtist,
  ArtistRow,
  ArtistAvatar,
  ArtistName,
  AlbumRow,
  AlbumArt,
  AlbumInfo,
  AlbumTitle,
  AlbumArtist,
  NoResults,
  ArtistImage,
  ArtistContainer,
} from './styles';

function normalize(s?: string) {
  return (s ?? '').toLowerCase();
}

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const { library, setCurrentPath, setCurrentPlaylist } = useContext(AppContext);
  const navigate = useNavigate();

  const q = normalize(query);

  const matchingSongs = library.filter(
    (s) => normalize(s.title).includes(q) || normalize(s.artist).includes(q) || normalize(s.album).includes(q),
  );

  const artistMap = new Map<string, MetadataType[]>();
  for (const song of matchingSongs) {
    const key = song.artist ?? 'Unknown Artist';
    if (!artistMap.has(key)) artistMap.set(key, []);
    artistMap.get(key)!.push(song);
  }
  const artists = Array.from(artistMap.entries()).filter(([name]) => normalize(name).includes(q));

  const albumMap = new Map<string, MetadataType>();
  for (const song of matchingSongs) {
    const key = song.album ?? 'Unknown Album';
    if (!albumMap.has(key)) albumMap.set(key, song);
  }
  const albums = Array.from(albumMap.entries()).filter(([name]) => normalize(name).includes(q));

  const playSong = (song: MetadataType) => {
    const paths = matchingSongs.map((s) => s.path).filter((p): p is string => Boolean(p));
    setCurrentPlaylist?.(paths);
    setCurrentPath?.(song.path);
  };

  if (!q) return null;

  const hasResults = matchingSongs.length > 0;

  if (!hasResults) {
    return <StatusMessage>No results for &ldquo;{query}&rdquo;</StatusMessage>;
  }

  return (
    <SearchContainer>
      {artists.length > 0 && (
        <ResultsSection>
          <SectionTitle>Artists</SectionTitle>
          <ArtistContainer>
            {artists.map(([name, metadata]) => (
              <ArtistRow key={name} onClick={() => navigate(`/artists/${encodeURIComponent(name)}`)}>
                <ArtistAvatar>
                  {metadata[0].image ? (
                    <ArtistImage src={metadata[0].image} alt={name} />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                </ArtistAvatar>
                <ArtistName>{name}</ArtistName>
              </ArtistRow>
            ))}
          </ArtistContainer>
        </ResultsSection>
      )}

      {albums.length > 0 && (
        <ResultsSection>
          <SectionTitle>Albums</SectionTitle>
          {albums.map(([name, song]) => (
            <AlbumRow key={name} onClick={() => navigate(`/albums/${encodeURIComponent(name)}`)}>
              <AlbumArt>
                <AlbumImage metadata={song} height="100%" width="100%" />
              </AlbumArt>
              <AlbumInfo>
                <AlbumTitle>{name}</AlbumTitle>
                <AlbumArtist>{song.artist}</AlbumArtist>
              </AlbumInfo>
            </AlbumRow>
          ))}
        </ResultsSection>
      )}

      {matchingSongs.length > 0 && (
        <ResultsSection>
          <SectionTitle>Songs</SectionTitle>
          {matchingSongs.map((song, i) => (
            <SongRow key={song.path ?? i} onClick={() => playSong(song)}>
              <AlbumImage metadata={song} height="2.5rem" width="2.5rem" />
              <SongInfo>
                <SongTitle>{song.title}</SongTitle>
                <SongArtist>{song.artist}</SongArtist>
              </SongInfo>
            </SongRow>
          ))}
        </ResultsSection>
      )}

      <NoResults>
        {matchingSongs.length} {matchingSongs.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
      </NoResults>
    </SearchContainer>
  );
};

export default Search;
