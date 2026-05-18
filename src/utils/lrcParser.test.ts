import { describe, it, expect } from 'vitest';
import { parseLrc, getActiveIndex } from './lrcParser';

describe('parseLrc', () => {
  it('parses a simple [mm:ss] timestamp', () => {
    const lines = parseLrc('[00:10]Hello world');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual({ time: 10, text: 'Hello world' });
  });

  it('parses [mm:ss.xx] with centisecond precision', () => {
    const lines = parseLrc('[01:23.45]Lyric');
    expect(lines[0].time).toBeCloseTo(83.45);
  });

  it('parses [mm:ss.xxx] with millisecond precision', () => {
    const lines = parseLrc('[00:01.500]Half second');
    expect(lines[0].time).toBeCloseTo(1.5);
  });

  it('parses [mm:ss.x] with single fractional digit', () => {
    const lines = parseLrc('[00:02.5]Five hundred ms');
    expect(lines[0].time).toBeCloseTo(2.5);
  });

  it('strips the timestamp from the text', () => {
    const lines = parseLrc('[00:05.00]Clean text');
    expect(lines[0].text).toBe('Clean text');
  });

  it('skips lines with no text after stripping timestamps', () => {
    const content = '[00:00.00]\n[00:01.00]Real lyric';
    const lines = parseLrc(content);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Real lyric');
  });

  it('skips blank lines', () => {
    const content = '[00:01.00]Line one\n\n[00:02.00]Line two';
    const lines = parseLrc(content);
    expect(lines).toHaveLength(2);
  });

  it('supports multiple timestamps on a single line', () => {
    const lines = parseLrc('[00:10.00][00:30.00]Repeated lyric');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({ time: 10, text: 'Repeated lyric' });
    expect(lines[1]).toEqual({ time: 30, text: 'Repeated lyric' });
  });

  it('returns lines sorted by ascending time', () => {
    const content = '[00:30.00]Third\n[00:10.00]First\n[00:20.00]Second';
    const lines = parseLrc(content);
    expect(lines.map((l) => l.text)).toEqual(['First', 'Second', 'Third']);
  });

  it('handles minutes correctly', () => {
    const lines = parseLrc('[02:00.00]Two minutes');
    expect(lines[0].time).toBe(120);
  });

  it('returns an empty array for content with no valid timestamps', () => {
    expect(parseLrc('No timestamps here')).toHaveLength(0);
    expect(parseLrc('')).toHaveLength(0);
  });

  it('ignores LRC metadata tags like [ar:] and [ti:]', () => {
    const content = '[ti:Song Title]\n[ar:Artist Name]\n[00:05.00]First lyric';
    const lines = parseLrc(content);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('First lyric');
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
