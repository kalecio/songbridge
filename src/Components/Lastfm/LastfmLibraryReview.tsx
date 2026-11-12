import { useContext, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { useMetadataActions, type EditFields } from '../../hooks/useMetadataActions';
import { useI18n } from '../../i18n/I18nProvider';
import type { MetadataType } from '../../types';
import { Button } from '../Modal/styles';
import { useLastfm, useLastfmReason } from './LastfmProvider';
import { Actions, History, Panel } from './styles';
import type { Suggestion } from './importFields';

type TagField = 'title' | 'artist' | 'album' | 'track';
type Field = TagField | 'artwork';
interface Change {
  field: Field;
  current: string | number;
  suggested: string | number;
  artworkUrl?: string;
}
interface ReviewItem {
  song: MetadataType;
  changes: Change[];
  error?: string;
}
interface Match {
  name: string;
  artist: string;
}
interface AlbumTrack {
  title: string;
  artist: string;
  track: number;
}

const fields: TagField[] = ['title', 'artist', 'album', 'track'];
const comparable = (value: string | number) => String(value).trim().toLocaleLowerCase();

function differences(current: MetadataType, suggestion: Suggestion): Change[] {
  const changes: Change[] = fields.flatMap((field): Change[] => {
    const existing = current[field];
    const suggested = suggestion[field];
    const existingIsMissing =
      existing == null ||
      (typeof existing === 'string' && !existing.trim()) ||
      (field === 'track' && typeof existing === 'number' && existing <= 0);
    if (suggested == null || (typeof suggested === 'string' && !suggested.trim())) return [];
    if (!existingIsMissing && comparable(existing) === comparable(suggested)) return [];
    return [{ field, current: existingIsMissing ? '' : existing, suggested }];
  });
  if (!current.image && suggestion.artwork) {
    changes.push({ field: 'artwork', current: '', suggested: 'Last.fm', artworkUrl: suggestion.artwork });
  }
  return changes;
}

export default function LastfmLibraryReview() {
  const { library } = useContext(AppContext);
  const { status } = useLastfm();
  const reason = useLastfmReason();
  const { t } = useI18n();
  const { batchUpdateSongsMetadata } = useMetadataActions();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [selected, setSelected] = useState<Record<string, Field[]>>({});
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [busy, setBusy] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const cancelRef = useRef(false);
  const [phase, setPhase] = useState<'scan' | 'apply'>('scan');
  const [error, setError] = useState('');
  const [saveResults, setSaveResults] = useState<Array<{ path: string; error?: string; artwork?: boolean }> | null>(
    null,
  );

  const scan = async () => {
    const allFiles = library.filter((song) => song.path);
    setBusy(true);
    setPhase('scan');
    setCancelRequested(false);
    cancelRef.current = false;
    setError('');
    setSaveResults(null);
    setItems([]);
    setSelected({});
    setProgress({ current: 0, total: allFiles.length });
    const found: ReviewItem[] = [];
    const albumTracks = new Map<string, Promise<AlbumTrack[]>>();

    for (const [index, song] of allFiles.entries()) {
      if (cancelRef.current) break;
      try {
        const path = song.path!;
        // Compare the on-disk tags, not potentially stale library state.
        const current = await invoke<MetadataType>('get_metadata', { path });
        let suggestion: Suggestion;
        if (current.title?.trim()) {
          if (current.artist?.trim()) {
            try {
              suggestion = await invoke<Suggestion>('lastfm_details', {
                kind: 'track',
                name: current.title.trim(),
                artistName: current.artist.trim(),
              });
            } catch (cause) {
              const code = String(cause).replace(/^Error:\s*/, '');
              if (!code.includes('no_results') && !code.includes('invalid_request')) throw cause;
              const matches = await invoke<Match[]>('lastfm_search', {
                kind: 'track',
                query: current.title.trim(),
                artistName: current.artist.trim(),
              });
              const match = matches[0];
              if (!match) throw new Error('no_results');
              suggestion = await invoke<Suggestion>('lastfm_details', {
                kind: 'track',
                name: match.name,
                artistName: match.artist,
              });
            }
          } else {
            const matches = await invoke<Match[]>('lastfm_search', {
              kind: 'track',
              query: current.title.trim(),
              artistName: '',
            });
            const match = matches[0];
            if (!match) throw new Error('no_results');
            suggestion = await invoke<Suggestion>('lastfm_details', {
              kind: 'track',
              name: match.name,
              artistName: match.artist,
            });
          }
        } else if (current.album?.trim() && current.track && current.track > 0) {
          const key = `${current.album.trim().toLocaleLowerCase()}\u0000${(current.artist ?? '').trim().toLocaleLowerCase()}`;
          let listing = albumTracks.get(key);
          if (!listing) {
            listing = invoke<AlbumTrack[]>('lastfm_album_tracks', {
              album: current.album.trim(),
              artistName: current.artist?.trim() ?? '',
            });
            albumTracks.set(key, listing);
          }
          const match = (await listing).find((track) => track.track === current.track);
          if (!match) throw new Error('no_results');
          suggestion = await invoke<Suggestion>('lastfm_details', {
            kind: 'track',
            name: match.title,
            artistName: match.artist,
          });
        } else {
          throw new Error('missing_metadata');
        }
        const changes = differences(current, suggestion);
        if (changes.length) found.push({ song: { ...song, ...current }, changes });
      } catch (cause) {
        found.push({ song, changes: [], error: String(cause).replace(/^Error:\s*/, '') });
      }
      setItems([...found]);
      setProgress({ current: index + 1, total: allFiles.length });
    }

    setBusy(false);
  };

  const apply = async () => {
    if (!items) return;
    setBusy(true);
    setPhase('apply');
    setError('');
    const perTrack: Record<string, EditFields> = {};
    const artworkCache = new Map<string, string>();
    const artworkFailures: Array<{ path: string; error: string; artwork: boolean }> = [];
    for (const item of items) {
      const path = item.song.path;
      if (!path || item.error) continue;
      const chosen = selected[path] ?? [];
      if (!chosen.length) continue;
      const update: EditFields = { updateFields: chosen.filter((field) => field !== 'artwork') };
      for (const change of item.changes) {
        if (!chosen.includes(change.field)) continue;
        if (change.field === 'artwork') {
          const artworkUrl = change.artworkUrl;
          if (!artworkUrl) continue;
          let artworkPath = artworkCache.get(artworkUrl);
          if (!artworkPath) {
            try {
              const result = await invoke<{ path: string }>('lastfm_artwork', { url: artworkUrl });
              artworkPath = result.path;
              artworkCache.set(artworkUrl, artworkPath);
            } catch (cause) {
              artworkFailures.push({ path, error: String(cause), artwork: true });
              continue;
            }
          }
          update.coverArtPath = artworkPath;
        } else if (change.field === 'track') update.track = Number(change.suggested);
        else update[change.field] = String(change.suggested);
      }
      if (update.coverArtPath || update.updateFields?.length) perTrack[path] = update;
    }
    try {
      const result = await batchUpdateSongsMetadata(
        Object.keys(perTrack),
        {},
        {
          perTrack,
          reportFailures: true,
        },
      );
      setSaveResults([...result, ...artworkFailures]);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (path: string, field: Field, checked: boolean) => {
    setSelected((previous) => {
      const next = new Set(previous[path] ?? []);
      if (checked) next.add(field);
      else next.delete(field);
      return { ...previous, [path]: [...next] };
    });
  };

  const selectedCount = Object.values(selected).reduce((count, value) => count + value.length, 0);
  const diffCount = items?.filter((item) => item.changes.length).length ?? 0;
  const labels: Record<Field, string> = {
    title: t('metadata.title'),
    artist: t('metadata.artist'),
    album: t('metadata.album'),
    track: t('metadata.trackNumber'),
    artwork: t('metadata.coverArt'),
  };

  return (
    <Panel>
      <p>{t('lastfm.libraryReviewDescription')}</p>
      {!status?.connected && <p role="status">{t('lastfm.libraryReviewRequiresConnection')}</p>}
      <Actions>
        {!busy ? (
          <Button disabled={!status?.connected || !library.length} onClick={() => void scan()}>
            {t(items ? 'lastfm.libraryReviewAgain' : 'lastfm.libraryReviewStart')}
          </Button>
        ) : phase === 'scan' ? (
          <>
            <Button
              $variant="ghost"
              onClick={() => {
                cancelRef.current = true;
                setCancelRequested(true);
              }}
            >
              {t('common.cancel')}
            </Button>
            <span role="status">
              {t('lastfm.libraryReviewProgress', { current: progress.current, total: progress.total })}
            </span>
          </>
        ) : (
          <span role="status">{t('common.loading')}</span>
        )}
      </Actions>
      {progress.total > 0 && items && (
        <p>
          {cancelRequested
            ? t('lastfm.libraryReviewCancelled')
            : t('lastfm.libraryReviewSummary', {
                checked: progress.current,
                total: progress.total,
                changed: diffCount,
              })}
        </p>
      )}
      {items && items.length > 0 && (
        <History aria-label={t('lastfm.libraryReviewResults')}>
          {items.map((item, index) => {
            const path = item.song.path ?? String(index);
            return (
              <li key={path}>
                <strong>{item.song.title || t('lyrics.unknownTrack')}</strong> ·{' '}
                {item.song.artist || t('common.unknownArtist')}
                {item.error ? (
                  <small>{t('lastfm.failed', { error: reason(item.error) })}</small>
                ) : (
                  item.changes.map((change) => (
                    <label key={change.field}>
                      <input
                        type="checkbox"
                        aria-label={t('lastfm.libraryReviewApprove', { field: labels[change.field] })}
                        checked={(selected[path] ?? []).includes(change.field)}
                        disabled={busy || Boolean(saveResults)}
                        onChange={(event) => toggle(path, change.field, event.target.checked)}
                      />
                      <small>
                        <strong>{labels[change.field]}</strong>:{' '}
                        {change.current === '' ? t('lastfm.empty') : String(change.current)} →{' '}
                        {change.field === 'artwork' ? t('lastfm.newArtwork') : String(change.suggested)}
                      </small>
                    </label>
                  ))
                )}
                {saveResults?.some((result) => result.path === path) &&
                  (() => {
                    const result =
                      saveResults.find((entry) => entry.path === path && entry.error) ??
                      saveResults.find((entry) => entry.path === path);
                    if (!result) return null;
                    if (result.artwork && result.error) {
                      return <small>{t('lastfm.artworkFailed', { error: result.error })}</small>;
                    }
                    return (
                      <small>{result.error ? t('lastfm.failed', { error: result.error }) : t('lastfm.applied')}</small>
                    );
                  })()}
              </li>
            );
          })}
        </History>
      )}
      {items && !busy && !items.length && <p>{t('lastfm.libraryReviewNoDifferences')}</p>}
      {items && !busy && items.length > 0 && (
        <Actions>
          <Button disabled={!selectedCount || busy || Boolean(saveResults)} onClick={() => void apply()}>
            {t('lastfm.libraryReviewApply', { count: selectedCount })}
          </Button>
        </Actions>
      )}
      {error && <p role="alert">{reason(error)}</p>}
    </Panel>
  );
}
