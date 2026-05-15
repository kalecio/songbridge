import { act, renderHook } from '@testing-library/react';
import { RECENT_PLAYLISTS_MAX, RECENT_PLAYLISTS_STORAGE_KEY, usePlayHistory } from './usePlayHistory';

beforeEach(() => {
  window.localStorage.clear();
});

describe('usePlayHistory', () => {
  it('returns an empty list when nothing is stored', () => {
    const { result } = renderHook(() => usePlayHistory());
    expect(result.current.recentPlaylistIds).toEqual([]);
  });

  it('hydrates from localStorage on mount', () => {
    window.localStorage.setItem(RECENT_PLAYLISTS_STORAGE_KEY, JSON.stringify(['a', 'b', 'c']));
    const { result } = renderHook(() => usePlayHistory());
    expect(result.current.recentPlaylistIds).toEqual(['a', 'b', 'c']);
  });

  it('adds an id to the front when recorded', () => {
    const { result } = renderHook(() => usePlayHistory());
    act(() => result.current.recordPlaylistPlay('p1'));
    expect(result.current.recentPlaylistIds).toEqual(['p1']);
  });

  it('promotes a re-recorded id to the front (no duplicates)', () => {
    const { result } = renderHook(() => usePlayHistory());
    act(() => result.current.recordPlaylistPlay('a'));
    act(() => result.current.recordPlaylistPlay('b'));
    act(() => result.current.recordPlaylistPlay('a'));
    expect(result.current.recentPlaylistIds).toEqual(['a', 'b']);
  });

  it('caps the list at the configured maximum', () => {
    const { result } = renderHook(() => usePlayHistory());
    for (let i = 0; i < RECENT_PLAYLISTS_MAX + 3; i++) {
      act(() => result.current.recordPlaylistPlay(`p${i}`));
    }
    expect(result.current.recentPlaylistIds).toHaveLength(RECENT_PLAYLISTS_MAX);
    // Most recent at the front
    expect(result.current.recentPlaylistIds[0]).toBe(`p${RECENT_PLAYLISTS_MAX + 2}`);
  });

  it('persists the list to localStorage', () => {
    const { result } = renderHook(() => usePlayHistory());
    act(() => result.current.recordPlaylistPlay('x'));
    expect(JSON.parse(window.localStorage.getItem(RECENT_PLAYLISTS_STORAGE_KEY) ?? '[]')).toEqual(['x']);
  });

  it('ignores empty ids', () => {
    const { result } = renderHook(() => usePlayHistory());
    act(() => result.current.recordPlaylistPlay(''));
    expect(result.current.recentPlaylistIds).toEqual([]);
  });

  it('returns an empty list when stored data is corrupt', () => {
    window.localStorage.setItem(RECENT_PLAYLISTS_STORAGE_KEY, '{not-json');
    const { result } = renderHook(() => usePlayHistory());
    expect(result.current.recentPlaylistIds).toEqual([]);
  });
});
