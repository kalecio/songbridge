import { describe, it, expect } from 'vitest';
import { parseLrc, getActiveIndex } from './lrcParser';

describe('parseLrc', () => {
  it('parses a simple [mm:ss] timestamp', () => {
    const result = parseLrc('[00:10]Hello world');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toEqual({ time: 10, text: 'Hello world' });
    expect(result.isPlainText).toBe(false);
  });

  it('parses [mm:ss.xx] with centisecond precision', () => {
    const result = parseLrc('[01:23.45]Lyric');
    expect(result.lines[0].time).toBeCloseTo(83.45);
    expect(result.isPlainText).toBe(false);
  });

  it('parses [mm:ss.xxx] with millisecond precision', () => {
    const result = parseLrc('[00:01.500]Half second');
    expect(result.lines[0].time).toBeCloseTo(1.5);
    expect(result.isPlainText).toBe(false);
  });

  it('parses [mm:ss.x] with single fractional digit', () => {
    const result = parseLrc('[00:02.5]Five hundred ms');
    expect(result.lines[0].time).toBeCloseTo(2.5);
    expect(result.isPlainText).toBe(false);
  });

  it('strips the timestamp from the text', () => {
    const result = parseLrc('[00:05.00]Clean text');
    expect(result.lines[0].text).toBe('Clean text');
    expect(result.isPlainText).toBe(false);
  });

  it('skips lines with no text after stripping timestamps', () => {
    const content = '[00:00.00]\n[00:01.00]Real lyric';
    const result = parseLrc(content);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].text).toBe('Real lyric');
    expect(result.isPlainText).toBe(false);
  });

  it('skips blank lines', () => {
    const content = '[00:01.00]Line one\n\n[00:02.00]Line two';
    const result = parseLrc(content);
    expect(result.lines).toHaveLength(2);
    expect(result.isPlainText).toBe(false);
  });

  it('supports multiple timestamps on a single line', () => {
    const result = parseLrc('[00:10.00][00:30.00]Repeated lyric');
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toEqual({ time: 10, text: 'Repeated lyric' });
    expect(result.lines[1]).toEqual({ time: 30, text: 'Repeated lyric' });
    expect(result.isPlainText).toBe(false);
  });

  it('returns lines sorted by ascending time', () => {
    const content = '[00:30.00]Third\n[00:10.00]First\n[00:20.00]Second';
    const result = parseLrc(content);
    expect(result.lines.map((l) => l.text)).toEqual(['First', 'Second', 'Third']);
    expect(result.isPlainText).toBe(false);
  });

  it('handles minutes correctly', () => {
    const result = parseLrc('[02:00.00]Two minutes');
    expect(result.lines[0].time).toBe(120);
    expect(result.isPlainText).toBe(false);
  });

  it('parses plain text content as lyrics (new behavior)', () => {
    const result = parseLrc('No timestamps here');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].text).toBe('No timestamps here');
    expect(result.isPlainText).toBe(true);
    expect(parseLrc('').lines).toHaveLength(0);
    expect(parseLrc('').isPlainText).toBe(true);
  });

  it('ignores LRC metadata tags like [ar:] and [ti:]', () => {
    const content = '[ti:Song Title]\n[ar:Artist Name]\n[00:05.00]First lyric';
    const result = parseLrc(content);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].text).toBe('First lyric');
    expect(result.isPlainText).toBe(false);
  });

  describe('plain text (no timestamps)', () => {
    it('parses each non-empty line as a lyric', () => {
      const content = 'Line one\nLine two\nLine three';
      const result = parseLrc(content);
      expect(result.isPlainText).toBe(true);
      expect(result.lines).toHaveLength(3);
      expect(result.lines.map((l) => l.text)).toEqual(['Line one', 'Line two', 'Line three']);
    });

    it('skips empty lines', () => {
      const content = 'Line one\n\nLine two\n\n\nLine three';
      const result = parseLrc(content);
      expect(result.isPlainText).toBe(true);
      expect(result.lines).toHaveLength(3);
    });

    it('trims whitespace from lines', () => {
      const content = '  Line one  \n\tLine two\t';
      const result = parseLrc(content);
      expect(result.lines[0].text).toBe('Line one');
      expect(result.lines[1].text).toBe('Line two');
    });

    it('assigns sequential time indices starting from 0', () => {
      const content = 'First\nSecond\nThird';
      const result = parseLrc(content);
      expect(result.lines[0].time).toBe(0);
      expect(result.lines[1].time).toBe(1);
      expect(result.lines[2].time).toBe(2);
    });

    it('returns empty for blank content', () => {
      const result = parseLrc('');
      expect(result.isPlainText).toBe(true);
      expect(result.lines).toHaveLength(0);
    });

    it('returns empty for only whitespace', () => {
      const result = parseLrc('   \n\t\n  ');
      expect(result.isPlainText).toBe(true);
      expect(result.lines).toHaveLength(0);
    });

    it("detects timestamped content correctly (metadata tags don't count)", () => {
      const content = '[ti:Title]\n[ar:Artist]\nJust plain text';
      const result = parseLrc(content);
      expect(result.isPlainText).toBe(true);
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].text).toBe('Just plain text');
    });

    it('treats mixed timestamped and plain as timestamped', () => {
      const content = '[00:10]Timestamped\nPlain line';
      const result = parseLrc(content);
      expect(result.isPlainText).toBe(false);
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].text).toBe('Timestamped');
    });
  });
});

describe('getActiveIndex', () => {
  const lines = [
    { time: 0, text: 'Intro' },
    { time: 5, text: 'Verse 1' },
    { time: 10, text: 'Chorus' },
    { time: 15, text: 'Outro' },
  ];

  it('returns -1 before the first line', () => {
    expect(getActiveIndex(lines, -1)).toBe(-1);
  });

  it('returns 0 exactly at the first timestamp', () => {
    expect(getActiveIndex(lines, 0)).toBe(0);
  });

  it('returns the last line whose time <= currentSeconds', () => {
    expect(getActiveIndex(lines, 7)).toBe(1);
    expect(getActiveIndex(lines, 10)).toBe(2);
    expect(getActiveIndex(lines, 14.9)).toBe(2);
    expect(getActiveIndex(lines, 15)).toBe(3);
  });

  it('returns the last index when currentSeconds exceeds all timestamps', () => {
    expect(getActiveIndex(lines, 999)).toBe(3);
  });

  it('returns -1 for an empty lines array', () => {
    expect(getActiveIndex([], 10)).toBe(-1);
  });
});
