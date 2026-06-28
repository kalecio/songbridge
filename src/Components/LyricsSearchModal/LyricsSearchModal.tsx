import { useCallback, useEffect, useRef, useState } from 'react';
import { FaSearchengin, FaDownload, FaMusic, FaClock, FaBan } from 'react-icons/fa6';
import Modal from '../Modal/Modal';
import { MetadataType, LyricsTrackResponse } from '../../types';
import { useLrclibLyrics, SearchLyricsParams } from '../../hooks/useLrclibLyrics';
import { error as logError } from '../../logger';
import {
  ModalContainer,
  SearchSection,
  SearchInput,
  SearchButton,
  ResultsList,
  ResultItem,
  ResultInfo,
  ResultMeta,
  ResultActions,
  DownloadButton,
  LoadingSpinner,
  NoResults,
  ErrorMessage,
  TrackTypeBadge,
} from './styles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  song: MetadataType;
}

export const LyricsSearchModal = ({ isOpen, onClose, song }: Props) => {
  const { searchLyrics, downloadLyrics } = useLrclibLyrics();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LyricsTrackResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const initialSearchDone = useRef(false);

  const performSearch = useCallback(async () => {
    if (!query.trim() && !song.title && !song.artist) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const searchParams: SearchLyricsParams = {
        query: query.trim() || undefined,
        trackName: song.title,
        artistName: song.artist,
        albumName: song.album,
      };
      const data = await searchLyrics(searchParams);
      setResults(data);
    } catch (err) {
      setError(`Search failed: ${err}`);
      logError(`Lyrics search failed: ${err}`).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [query, song.title, song.artist, song.album, searchLyrics]);

  // Initial search when modal opens - only run once
  useEffect(() => {
    if (isOpen && !initialSearchDone.current) {
      initialSearchDone.current = true;
      setQuery(`${song.title} ${song.artist}`.trim());
      performSearch();
    } else if (!isOpen) {
      initialSearchDone.current = false;
    }
  }, [isOpen, song.title, song.artist, song.album, performSearch]);

  const handleDownload = async (track: LyricsTrackResponse, preferSynced: boolean) => {
    if (!song.path) return;

    const hasSynced = Boolean(track.syncedLyrics);
    const hasPlain = Boolean(track.plainLyrics);
    if (preferSynced && !hasSynced) return;
    if (!preferSynced && !hasPlain) return;

    setDownloading(track.id);
    try {
      await downloadLyrics({
        songPath: song.path,
        trackId: track.id,
        preferSynced,
        plainLyrics: track.plainLyrics ?? undefined,
        syncedLyrics: track.syncedLyrics ?? undefined,
      });
      onClose();
    } catch (err) {
      setError(`Download failed: ${err}`);
      logError(`Lyrics download failed: ${err}`).catch(() => {});
    } finally {
      setDownloading(null);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown duration';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Lyrics (lrclib.net)" dismissible={!loading} maxWidth="900px">
      <ModalContainer>
        <SearchSection>
          <SearchInput
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Track, artist, album..."
            disabled={loading}
          />
          <SearchButton onClick={performSearch} disabled={loading || !query.trim()}>
            <FaSearchengin /> {loading ? 'Searching...' : 'Search'}
          </SearchButton>
        </SearchSection>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {searched && !loading && results.length === 0 && <NoResults>No lyrics found for this search</NoResults>}

        {loading && <LoadingSpinner>Searching...</LoadingSpinner>}

        <ResultsList>
          {results.map((track) => {
            const hasSynced = Boolean(track.syncedLyrics);
            const hasPlain = Boolean(track.plainLyrics);
            const isInstrumental = track.instrumental;

            return (
              <ResultItem key={track.id}>
                <ResultInfo>
                  <strong>{track.trackName || 'Unknown Track'}</strong>
                  <ResultMeta>
                    {track.artistName && <span>{track.artistName}</span>}
                    {track.albumName && <span>{track.albumName}</span>}
                    {track.duration && <span>{formatDuration(track.duration)}</span>}
                    {isInstrumental && <TrackTypeBadge instrumental>Instrumental</TrackTypeBadge>}
                  </ResultMeta>
                  <TrackTypeBadge synced={hasSynced} plain={hasPlain}>
                    {hasSynced && <FaClock />} {hasSynced && 'Synced'}
                    {hasPlain && <FaMusic />} {hasPlain && 'Plain'}
                  </TrackTypeBadge>
                </ResultInfo>
                <ResultActions>
                  {hasSynced && (
                    <DownloadButton
                      onClick={() => handleDownload(track, true)}
                      disabled={downloading === track.id}
                      variant="primary"
                    >
                      {downloading === track.id ? (
                        <FaClock className="spinning" />
                      ) : (
                        <>
                          <FaDownload /> Synced
                        </>
                      )}
                    </DownloadButton>
                  )}
                  {hasPlain && (
                    <DownloadButton
                      onClick={() => handleDownload(track, false)}
                      disabled={downloading === track.id}
                      variant="secondary"
                    >
                      {downloading === track.id ? (
                        <FaClock className="spinning" />
                      ) : (
                        <>
                          <FaDownload /> Plain
                        </>
                      )}
                    </DownloadButton>
                  )}
                  {isInstrumental && !hasSynced && !hasPlain && (
                    <DownloadButton variant="disabled" disabled>
                      <FaBan /> Instrumental only
                    </DownloadButton>
                  )}
                </ResultActions>
              </ResultItem>
            );
          })}
        </ResultsList>
      </ModalContainer>
    </Modal>
  );
};
