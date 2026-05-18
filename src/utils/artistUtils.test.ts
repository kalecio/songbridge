import { splitArtists } from './artistUtils';

describe('splitArtists', () => {
  describe('single artist — no splitting', () => {
    it('returns a single-element array for a plain name', () => {
      expect(splitArtists('Radiohead')).toEqual(['Radiohead']);
    });

    it('preserves a name that contains a slash without surrounding spaces', () => {
      expect(splitArtists('AC/DC')).toEqual(['AC/DC']);
    });

    it('preserves a name with an ampersand when there are no spaces around it', () => {
      expect(splitArtists('Simon&Garfunkel')).toEqual(['Simon&Garfunkel']);
    });
  });

  describe('comma and semicolon', () => {
    it('splits on a comma', () => {
      expect(splitArtists('Artist A, Artist B')).toEqual(['Artist A', 'Artist B']);
    });

    it('splits on a comma without trailing space', () => {
      expect(splitArtists('Artist A,Artist B')).toEqual(['Artist A', 'Artist B']);
    });

    it('splits on a semicolon', () => {
      expect(splitArtists('Artist A; Artist B')).toEqual(['Artist A', 'Artist B']);
    });

    it('splits three artists separated by commas', () => {
      expect(splitArtists('A, B, C')).toEqual(['A', 'B', 'C']);
    });
  });

  describe('slash', () => {
    it('splits on a slash surrounded by spaces', () => {
      expect(splitArtists('Artist A / Artist B')).toEqual(['Artist A', 'Artist B']);
    });
  });

  describe('feat / ft / featuring', () => {
    it('splits on "feat."', () => {
      expect(splitArtists('Eminem feat. Rihanna')).toEqual(['Eminem', 'Rihanna']);
    });

    it('splits on "feat" without period', () => {
      expect(splitArtists('Eminem feat Rihanna')).toEqual(['Eminem', 'Rihanna']);
    });

    it('splits on "ft."', () => {
      expect(splitArtists('Drake ft. Rihanna')).toEqual(['Drake', 'Rihanna']);
    });

    it('splits on "ft" without period', () => {
      expect(splitArtists('Drake ft Rihanna')).toEqual(['Drake', 'Rihanna']);
    });

    it('splits on "featuring"', () => {
      expect(splitArtists('Kanye West featuring Jay-Z')).toEqual(['Kanye West', 'Jay-Z']);
    });

    it('is case-insensitive for the separator keyword', () => {
      expect(splitArtists('Artist A FEAT. Artist B')).toEqual(['Artist A', 'Artist B']);
      expect(splitArtists('Artist A Feat Artist B')).toEqual(['Artist A', 'Artist B']);
    });
  });

  describe('parenthesised featured artist', () => {
    it('extracts artist from "(feat. X)"', () => {
      expect(splitArtists('Beyoncé (feat. Jay-Z)')).toEqual(['Beyoncé', 'Jay-Z']);
    });

    it('extracts artist from "(ft. X)"', () => {
      expect(splitArtists('Artist A (ft. Artist B)')).toEqual(['Artist A', 'Artist B']);
    });

    it('extracts artist from "(featuring X)"', () => {
      expect(splitArtists('Artist A (featuring Artist B)')).toEqual(['Artist A', 'Artist B']);
    });
  });

  describe('mixed separators', () => {
    it('handles comma followed by feat', () => {
      expect(splitArtists('A, B feat. C')).toEqual(['A', 'B', 'C']);
    });
  });

  describe('whitespace handling', () => {
    it('trims whitespace from each resulting name', () => {
      expect(splitArtists('  Artist A ,  Artist B  ')).toEqual(['Artist A', 'Artist B']);
    });

    it('filters out empty segments produced by double separators', () => {
      expect(splitArtists('A,, B')).toEqual(['A', 'B']);
    });
  });
});
