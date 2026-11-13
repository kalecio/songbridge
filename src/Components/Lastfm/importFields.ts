import type { MetadataType } from '../../types';
import type { EditFields } from '../../hooks/useMetadataActions';

export type ImportField = 'title' | 'artist' | 'album' | 'track';
export interface Suggestion {
  title: string | null;
  artist: string | null;
  album: string | null;
  track: number | null;
  artwork: string | null;
  url: string;
}

export function importFields(
  current: MetadataType,
  suggestion: Suggestion,
  selected: ImportField[],
  fillMissing: boolean,
  artworkPath?: string,
): EditFields {
  const fields: EditFields = { updateFields: [] };
  for (const key of selected) {
    const value = suggestion[key];
    const existing = current[key];
    const missing = existing == null || (typeof existing === 'string' ? !existing.trim() : existing <= 0);
    if (value == null || value === '' || (fillMissing && !missing)) continue;
    if (key === 'track') {
      if (typeof value === 'number' && value > 0) {
        fields.track = value;
        fields.updateFields!.push(key);
      }
    } else {
      fields[key] = String(value);
      fields.updateFields!.push(key);
    }
  }
  if (artworkPath && (!fillMissing || !current.image)) fields.coverArtPath = artworkPath;
  return fields;
}
