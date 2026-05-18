// Separates multi-artist strings like "A feat. B" or "A, B" into individual names.
// A song split into N artists appears under all N artist pages.
const SEPARATOR_RE = /,|;|\s+\/\s+|\s+(?:feat\.?|ft\.?|featuring)\s+/i;

export function splitArtists(artist: string): string[] {
  return (
    artist
      // "A (feat. B)" → "A, B" so the split below handles it uniformly
      .replace(/\s*\(\s*(?:feat\.?|ft\.?|featuring)\s+([^)]+)\)/gi, ', $1')
      .split(SEPARATOR_RE)
      .map((a) => a.trim())
      .filter(Boolean)
  );
}
