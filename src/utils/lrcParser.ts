export interface LrcLine {
  time: number;
  text: string;
}

// Matches [mm:ss], [mm:ss.x], [mm:ss.xx], [mm:ss.xxx]
const TIMESTAMP_RE = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

function parseSeconds(mins: string, secs: string, frac?: string): number {
  const ms = frac ? parseInt(frac.padEnd(3, '0'), 10) : 0;
  return parseInt(mins, 10) * 60 + parseInt(secs, 10) + ms / 1000;
}

export function parseLrc(content: string): LrcLine[] {
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

  return lines.sort((a, b) => a.time - b.time);
}

export function getActiveIndex(lines: LrcLine[], currentSeconds: number): number {
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentSeconds) active = i;
    else break;
  }
  return active;
}
