import { displayTitle, filenameWithoutExt } from './songDisplay';

describe('songDisplay', () => {
  describe('filenameWithoutExt', () => {
    it('strips a POSIX directory and extension', () => {
      expect(filenameWithoutExt('/Users/me/music/track.mp3')).toBe('track');
    });

    it('strips a Windows directory and extension', () => {
      expect(filenameWithoutExt('C:\\Music\\track.flac')).toBe('track');
    });

    it('returns the input when there is no extension', () => {
      expect(filenameWithoutExt('/Users/me/track')).toBe('track');
    });

    it('keeps a leading dot for dotfiles (no extension to strip)', () => {
      expect(filenameWithoutExt('/Users/me/.hidden')).toBe('.hidden');
    });

    it('uses the last dot when the filename has multiple', () => {
      expect(filenameWithoutExt('/m/song.live.mp3')).toBe('song.live');
    });
  });

  describe('displayTitle', () => {
    it('returns the trimmed title when present', () => {
      expect(displayTitle({ title: '  Roundabout  ', path: '/m/x.mp3' })).toBe('Roundabout');
    });

    it('falls back to the filename without extension when title is missing', () => {
      expect(displayTitle({ path: '/Users/me/music/My Song (Live).mp3' })).toBe('My Song (Live)');
    });

    it('falls back to the filename when title is blank', () => {
      expect(displayTitle({ title: '   ', path: '/m/song.mp3' })).toBe('song');
    });

    it('returns the default fallback when neither title nor path exist', () => {
      expect(displayTitle({})).toBe('Unknown track');
    });

    it('respects a custom fallback', () => {
      expect(displayTitle(undefined, 'no name')).toBe('no name');
      expect(displayTitle({}, 'no name')).toBe('no name');
    });
  });
});
