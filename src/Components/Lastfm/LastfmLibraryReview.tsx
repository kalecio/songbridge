import { useContext, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { useMetadataActions, type EditFields } from '../../hooks/useMetadataActions';
import { useI18n } from '../../i18n/I18nProvider';
import type { MetadataType } from '../../types';
import { Button } from '../Modal/styles';
import { useLastfm, useLastfmReason } from './LastfmProvider';
import { Actions, ApplySummary, History, Panel } from './styles';
import type { Suggestion } from './importFields';
import { getFilenameSearchName } from './searchQuery';

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

async function findTrackSuggestion(query: string, artistName: string): Promise<Suggestion> {
  if (artistName.trim()) {
    try {
      return await invoke<Suggestion>('lastfm_details', {
        kind: 'track',
        name: query,
        artistName: artistName.trim(),
      });
    } catch (cause) {
      const code = String(cause).replace(/^Error:\s*/, '');
      if (!code.includes('no_results') && !code.includes('invalid_request')) throw cause;
    }
  }

  const matches = await invoke<Match[]>('lastfm_search', {
    kind: 'track',
    query,
    artistName: artistName.trim(),
  });
  const match = matches[0];
  if (!match) throw new Error('no_results');
  return invoke<Suggestion>('lastfm_details', {
    kind: 'track',
    name: match.name,
    artistName: match.artist,
  });
}

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
        const filenameQuery = getFilenameSearchName(path);
        const titleQueries = current.title?.trim() ? [current.title.trim()] : [];
        let suggestion: Suggestion | undefined;
        let lookupError: unknown;

        for (const query of titleQueries) {
          try {
            suggestion = await findTrackSuggestion(query, current.artist ?? '');
            break;
          } catch (cause) {
            const code = String(cause).replace(/^Error:\s*/, '');
            if (!code.includes('no_results') && !code.includes('invalid_request')) throw cause;
            lookupError = cause;
          }
        }

        if (!suggestion && current.album?.trim() && current.track && current.track > 0) {
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
          if (match) {
            suggestion = await invoke<Suggestion>('lastfm_details', {
              kind: 'track',
              name: match.title,
              artistName: match.artist,
            });
          }
        }
        if (!suggestion && filenameQuery && !titleQueries.includes(filenameQuery)) {
          try {
            suggestion = await findTrackSuggestion(filenameQuery, current.artist ?? '');
          } catch (cause) {
            const code = String(cause).replace(/^Error:\s*/, '');
            if (!code.includes('no_results') && !code.includes('invalid_request')) throw cause;
            lookupError = cause;
          }
        }
        if (!suggestion) {
          if (lookupError) throw lookupError;
          throw new Error('missing_metadata');
        }
        const changes = differences(current, suggestion);
        if (changes.length) found.push({ song: { ...song, ...current }, changes });
      } catch (cause) {
        const code = String(cause).replace(/^Error:\s*/, '');
        found.push({ song, changes: [], error: code });
        if (code.includes('rate_limited')) {
          setError('rate_limited');
          setItems([...found]);
          setProgress({ current: index + 1, total: allFiles.length });
          break;
        }
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
    if (!Object.keys(perTrack).length && !artworkFailures.length) {
      setError('no_changes_selected');
      setBusy(false);
      return;
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
      const verifiedResults = await Promise.all(
        result.map(async (entry) => {
          if (entry.error) return entry;
          const fields = perTrack[entry.path];
          if (!fields) return entry;
          try {
            const saved = await invoke<MetadataType>('get_metadata', { path: entry.path });
            const mismatched = (fields.updateFields ?? []).some((field) => {
              const expected = fields[field];
              const actual = saved[field];
              return expected != null && comparable(expected) !== comparable(actual ?? '');
            });
            if (mismatched) {
              return { ...entry, error: 'write_verification_failed' };
            }
          } catch (cause) {
            return { ...entry, error: String(cause) };
          }
          return entry;
        }),
      );
      setSaveResults([...verifiedResults, ...artworkFailures]);
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
  const availableChangeCount = items?.reduce((count, item) => count + (item.error ? 0 : item.changes.length), 0) ?? 0;
  const savedTrackCount = saveResults?.filter((result) => !result.error).length ?? 0;
  const failedTrackCount = saveResults?.filter((result) => Boolean(result.error)).length ?? 0;
  const approveAll = () => {
    if (!items) return;
    setSelected(
      Object.fromEntries(
        items
          .filter((item) => item.changes.length && !item.error && item.song.path)
          .map((item) => [item.song.path!, item.changes.map((change) => change.field)]),
      ),
    );
  };
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
      {saveResults && (
        <ApplySummary role="status" aria-live="polite" data-failed={failedTrackCount > 0}>
          <strong>{t('lastfm.libraryReviewApplyComplete')}</strong>
          <span>{t('lastfm.libraryReviewApplySummary', { saved: savedTrackCount, failed: failedTrackCount })}</span>
        </ApplySummary>
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
          <Button
            $variant="ghost"
            disabled={!availableChangeCount || selectedCount === availableChangeCount || busy || Boolean(saveResults)}
            onClick={approveAll}
          >
            {t('lastfm.libraryReviewApproveAll')}
          </Button>
          <Button disabled={!selectedCount || busy || Boolean(saveResults)} onClick={() => void apply()}>
            {t('lastfm.libraryReviewApply', { count: selectedCount })}
          </Button>
        </Actions>
      )}
      {error && (
        <p role="alert">
          {error === 'no_changes_selected' ? t('lastfm.libraryReviewNoChangesSelected') : reason(error)}
        </p>
      )}
    </Panel>
  );
}
