import { describe, expect, it } from 'vitest';
import { importFields, type Suggestion } from './importFields';

const suggestion: Suggestion = {
  title: 'New title',
  artist: 'Suggested artist',
  album: 'New album',
  track: 9,
  artwork: 'https://lastfm.freetls.fastly.net/a.jpg',
  url: 'https://www.last.fm/',
};

describe('Last.fm field selection', () => {
  it('fills only missing raw tags and preserves embedded art', () => {
    expect(
      importFields(
        { title: 'Original', artist: ' ', album: '', track: 3, image: 'existing' },
        suggestion,
        ['title', 'artist', 'album', 'track'],
        true,
        '/cover.jpg',
      ),
    ).toEqual({
      artist: 'Suggested artist',
      album: 'New album',
      updateFields: ['artist', 'album'],
    });
  });
  it('requires explicit field selection before replacing existing tags', () => {
    expect(importFields({ title: 'Original', year: '2001' }, suggestion, ['title'], false)).toEqual({
      title: 'New title',
      updateFields: ['title'],
    });
  });
  it('album imports leave track titles and numbers out of the write mask', () => {
    const fields = importFields(
      { title: 'Track one', track: 1, artist: 'Guest' },
      suggestion,
      ['album'],
      false,
      '/cover.jpg',
    );
    expect(fields).toEqual({ album: 'New album', coverArtPath: '/cover.jpg', updateFields: ['album'] });
  });
  it('does not clear a tag when the service has no suggestion', () => {
    expect(importFields({}, { ...suggestion, title: null, track: 0 }, ['title', 'track'], false)).toEqual({
      updateFields: [],
    });
  });
});
