import { useMemo, useState } from 'react';
import type { MetadataType } from '../types';
import { displayTitle } from '../songDisplay';

export type SongSortField = 'original' | 'title' | 'album' | 'artist' | 'year';
export type SongSortDirection = 'asc' | 'desc';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const sortSongs = (
  songs: MetadataType[],
  sortField: SongSortField,
  sortDirection: SongSortDirection = 'asc',
) => {
  if (sortField === 'original') return songs;

  return [...songs].sort((left, right) => {
    const comparison =
      sortField === 'year'
        ? (Number(left.year) || 0) - (Number(right.year) || 0)
        : collator.compare(
            sortField === 'title' ? displayTitle(left) : (left[sortField] ?? ''),
            sortField === 'title' ? displayTitle(right) : (right[sortField] ?? ''),
          );
    const stableComparison = comparison || collator.compare(displayTitle(left), displayTitle(right));
    return sortDirection === 'asc' ? stableComparison : -stableComparison;
  });
};

export const useSongSort = (songs: MetadataType[], initialSortField: SongSortField = 'original') => {
  const [sortField, setSortField] = useState<SongSortField>(initialSortField);
  const [sortDirection, setSortDirection] = useState<SongSortDirection>('asc');

  const sortedSongs = useMemo(() => {
    return sortSongs(songs, sortField, sortDirection);
  }, [songs, sortDirection, sortField]);

  return { sortedSongs, sortField, setSortField, sortDirection, setSortDirection };
};
