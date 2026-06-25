export interface LrcLine {
  time: number;
  text: string;
}

export interface LrcParseResult {
  lines: LrcLine[];
  isPlainText: boolean;
}

// Matches [mm:ss], [mm:ss.x], [mm:ss.xx], [mm:ss.xxx]
const TIMESTAMP_RE = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

// Matches LRC metadata tags like [ti:...], [ar:...], [al:...], [by:...], [offset:...], etc.
const METADATA_TAG_RE = /^\[(?:ti|ar|al|by|offset|re|ve|la|offset):/i;

function parseSeconds(mins: string, secs: string, frac?: string): number {
  const ms = frac ? parseInt(frac.padEnd(3, '0'), 10) : 0;
  return parseInt(mins, 10) * 60 + parseInt(secs, 10) + ms / 1000;
}

function hasTimestamps(content: string): boolean {
  const lines = content.split('\n');
  for (const line of lines) {
    if (TIMESTAMP_RE.test(line)) {
      return true;
    }
  }
  return false;
}

function isMetadataTag(line: string): boolean {
  return METADATA_TAG_RE.test(line.trim());
}

export function parseLrc(content: string): LrcParseResult {
  if (!hasTimestamps(content)) {
    // Plain text: each non-empty line is a lyric line with no timestamp
    // Skip LRC metadata tags like [ti:...], [ar:...], etc.
    const lines: LrcLine[] = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !isMetadataTag(line))
      .map((text, index) => ({ time: index, text }));
    return { lines, isPlainText: true };
  }

  // Timestamped: existing behavior
  const lines: LrcLine[] = [];

  for (const raw of content.split('\n')) {
    const text = raw.replace(TIMESTAMP_RE, '').trim();
    if (!text) continue;

    TIMESTAMP_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TIMESTAMP_RE.exec(raw)) !== null) {
      lines.push({ time: parseSeconds(match[1], match[2], match[3]), text });
    }
  }

  return { lines: lines.sort((a, b) => a.time - b.time), isPlainText: false };
}

export function getActiveIndex(lines: LrcLine[], currentSeconds: number): number {
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentSeconds) active = i;
    else break;
  }
  return active;
}
