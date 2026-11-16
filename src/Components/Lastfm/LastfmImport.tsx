import { useId, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useI18n } from '../../i18n/I18nProvider';
import type { MetadataType } from '../../types';
import { useMetadataActions, type EditFields } from '../../hooks/useMetadataActions';
import { Button, Input } from '../Modal/styles';
import { useLastfm, useLastfmReason } from './LastfmProvider';
import {
  AlbumCard,
  AlbumCardArt,
  AlbumCardArtist,
  AlbumCardInfo,
  AlbumCardTitle,
  AlbumCardYear,
  Actions,
  History,
  ImportPanel,
  ResultsGrid,
} from './styles';
import { importFields, type ImportField, type Suggestion } from './importFields';
import { getLastfmSearchQuery } from './searchQuery';
import AlbumImage from '../AlbumImage/AlbumImage';

interface Match {
  name: string;
  artist: string;
  artwork?: string | null;
  year?: string | null;
  url: string;
  preview?: string;
}
interface Artwork {
  path: string;
  preview: string;
}
interface Result {
  path: string;
  error?: string;
  unchanged?: boolean;
}

export const LastfmImportButton = ({ onClick }: { onClick: () => void }) => {
  const { status } = useLastfm();
  const { t } = useI18n();
  return status?.configured && status.connected ? (
    <Button $variant="ghost" onClick={onClick}>
      {t('lastfm.findMetadata')}
    </Button>
  ) : null;
};

export default function LastfmImport({
  songs,
  kind,
  onBack,
  onClose,
  onBusy,
}: {
  songs: MetadataType[];
  kind: 'track' | 'album';
  onBack: () => void;
  onClose: () => void;
  onBusy: (_busy: boolean) => void;
}) {
  const { t } = useI18n();
  const reason = useLastfmReason();
  const id = useId();
  const { batchUpdateSongsMetadata } = useMetadataActions();
  const [query, setQuery] = useState(getLastfmSearchQuery(songs[0], kind));
  const [artist, setArtist] = useState(songs[0]?.artist ?? '');
  const [matches, setMatches] = useState<Match[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [useArtwork, setUseArtwork] = useState(false);
  const [selected, setSelected] = useState<ImportField[]>([]);
  const [fillMissing, setFillMissing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const available: ImportField[] = kind === 'album' ? ['album', 'artist'] : ['title', 'artist', 'album', 'track'];
  const labels = {
    title: t('metadata.title'),
    artist: t('metadata.artist'),
    album: t('metadata.album'),
    track: t('metadata.trackNumber'),
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  const search = () =>
    void run(async () => {
      setSuggestion(null);
      setArtwork(null);
      setMatches([]);
      const found = await invoke<Match[]>('lastfm_search', { kind, query: query.trim(), artistName: artist.trim() });
      const hydrated = await Promise.all(
        found.map(async (match) => {
          if (!match.artwork) return match;
          try {
            const image = await invoke<Artwork>('lastfm_artwork', { url: match.artwork });
            return { ...match, preview: image.preview };
          } catch {
            return match;
          }
        }),
      );
      setMatches(hydrated);
      if (!found.length) setError('no_results');
    });
  const choose = (match: Match) =>
    void run(async () => {
      setSuggestion(null);
      setArtwork(null);
      setUseArtwork(false);
      const value = await invoke<Suggestion>('lastfm_details', { kind, name: match.name, artistName: match.artist });
      // album.getInfo may omit artwork even when album.search returned it.
      if (!value.artwork && match.artwork) value.artwork = match.artwork;
      if (!value.year && match.year) value.year = match.year;
      setSuggestion(value);
      // Compilation artists must always be an explicit choice.
      setSelected(
        available.filter((key) => value[key] != null && value[key] !== '' && !(kind === 'album' && key === 'artist')),
      );
      if (value.artwork) {
        const downloaded = await invoke<Artwork>('lastfm_artwork', { url: value.artwork });
        setArtwork(downloaded);
        setUseArtwork(true);
      }
    });
  const apply = () =>
    void run(async () => {
      if (!suggestion) return;
      const perTrack: Record<string, EditFields> = {};
      const outcome: Result[] = [];
      // Read the actual file tags: library artwork is lazy and cannot tell us if
      // an embedded cover is missing. Never infer metadata from display names.
      for (const song of songs) {
        if (!song.path) continue;
        try {
          const current = await invoke<MetadataType>('get_metadata', { path: song.path });
          const fields = importFields(
            current,
            suggestion,
            selected,
            fillMissing,
            useArtwork ? artwork?.path : undefined,
          );
          if (!fields.updateFields?.length && !fields.coverArtPath) outcome.push({ path: song.path, unchanged: true });
          else perTrack[song.path] = fields;
        } catch (e) {
          outcome.push({ path: song.path, error: String(e) });
        }
      }
      outcome.push(...(await batchUpdateSongsMetadata(Object.keys(perTrack), {}, { perTrack, reportFailures: true })));
      setResults(outcome);
    });

  return (
    <ImportPanel>
      {kind === 'album' && <p>{t('lastfm.albumHelp')}</p>}
      {!results && (
        <>
          <fieldset disabled={busy}>
            <label htmlFor={id + '-query'}>{t('lastfm.query')}</label>
            <Input id={id + '-query'} value={query} onChange={(e) => setQuery(e.target.value)} maxLength={500} />
            {kind === 'track' && (
              <>
                <label htmlFor={id + '-artist'}>{t('lastfm.artist')}</label>
                <Input id={id + '-artist'} value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={500} />
              </>
            )}
            <Button onClick={search} disabled={busy || !query.trim()}>
              {t('lastfm.search')}
            </Button>
          </fieldset>
          <ResultsGrid aria-label={t('lastfm.results')}>
            {matches.map((match, index) => (
              <AlbumCard key={index} type="button" disabled={busy} onClick={() => choose(match)} aria-label={`${match.name} · ${match.artist}`}>
                <AlbumCardArt>
                  <AlbumImage metadata={{ image: match.preview, album: match.name }} height="100%" width="100%" />
                </AlbumCardArt>
                <AlbumCardInfo>
                  <AlbumCardTitle>{match.name}</AlbumCardTitle>
                  <div>
                    <AlbumCardArtist>{match.artist || t('lastfm.unknownArtist')}</AlbumCardArtist>
                    {match.year && <AlbumCardYear>{match.year}</AlbumCardYear>}
                  </div>
                </AlbumCardInfo>
              </AlbumCard>
            ))}
          </ResultsGrid>
          {suggestion && (
            <fieldset disabled={busy}>
              <legend>{t('lastfm.preview')}</legend>
              <label>
                <input type="checkbox" checked={fillMissing} onChange={(e) => setFillMissing(e.target.checked)} />
                {t('lastfm.fillMissing')}
              </label>
              {available
                .filter((key) => suggestion[key] != null && suggestion[key] !== '')
                .map((key) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={selected.includes(key)}
                      onChange={(e) =>
                        setSelected(e.target.checked ? [...selected, key] : selected.filter((field) => field !== key))
                      }
                    />
                    <span>
                      <strong>{labels[key]}</strong>
                      <br />
                      {t('lastfm.current', {
                        value: [
                          ...new Set(songs.map((song) => String(song[key] ?? '').trim() || t('lastfm.empty'))),
                        ].join(' · '),
                      })}
                      <br />
                      {t('lastfm.suggested', { value: String(suggestion[key]) })}
                    </span>
                  </label>
                ))}
              {artwork ? (
                <label>
                  <input type="checkbox" checked={useArtwork} onChange={(e) => setUseArtwork(e.target.checked)} />
                  <span>
                    {t('lastfm.newArtwork')}
                    <br />
                    <img src={artwork.preview} alt={t('metadata.coverArt')} />
                  </span>
                </label>
              ) : (
                <p>{t('lastfm.noArtwork')}</p>
              )}
              <Button $variant="ghost" onClick={() => void run(() => openUrl(suggestion.url))}>
                {t('lastfm.poweredBy')}
              </Button>
              <Button disabled={busy || (!selected.length && !useArtwork)} onClick={apply}>
                {t('lastfm.apply')}
              </Button>
            </fieldset>
          )}
        </>
      )}
      {busy && <p role="status">{t('common.loading')}</p>}
      {error && <p role="alert">{reason(error)}</p>}
      {results && (
        <History aria-label={t('lastfm.results')}>
          {results.map((result) => (
            <li key={result.path}>
              <strong>{result.path.replace(/\\/g, '/').split('/').pop()}</strong>
              <small>
                {result.error
                  ? t('lastfm.failed', { error: result.error })
                  : t(result.unchanged ? 'lastfm.unchanged' : 'lastfm.applied')}
              </small>
            </li>
          ))}
        </History>
      )}
      <Actions>
        <Button $variant="ghost" disabled={busy} onClick={results ? onClose : onBack}>
          {t(results ? 'lastfm.finish' : 'common.cancel')}
        </Button>
      </Actions>
    </ImportPanel>
  );
}
