import { eventToBinding, matchesBinding, formatBinding, DEFAULT_SHORTCUTS } from './keyboard';

const ev = (init: Partial<KeyboardEvent>) => new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', ...init });

describe('keyboard', () => {
  describe('eventToBinding', () => {
    it('returns the letter in uppercase for KeyA', () => {
      expect(eventToBinding(ev({ key: 's', code: 'KeyS' }))).toBe('S');
    });

    it('returns Space for the space bar', () => {
      expect(eventToBinding(ev({ key: ' ', code: 'Space' }))).toBe('Space');
    });

    it('returns ArrowRight for the right arrow', () => {
      expect(eventToBinding(ev({ key: 'ArrowRight', code: 'ArrowRight' }))).toBe('ArrowRight');
    });

    it('prefixes Mod for ctrl/meta', () => {
      expect(eventToBinding(ev({ key: 'k', code: 'KeyK', metaKey: true }))).toBe('Mod+K');
      expect(eventToBinding(ev({ key: 'k', code: 'KeyK', ctrlKey: true }))).toBe('Mod+K');
    });

    it('returns null for a bare modifier press', () => {
      expect(eventToBinding(ev({ key: 'Shift', code: 'ShiftLeft' }))).toBeNull();
    });

    it('orders modifiers Mod → Alt → Shift', () => {
      expect(eventToBinding(ev({ key: 'k', code: 'KeyK', ctrlKey: true, altKey: true, shiftKey: true }))).toBe(
        'Mod+Alt+Shift+K',
      );
    });

    it('preserves the / key (used for the search shortcut)', () => {
      expect(eventToBinding(ev({ key: '/', code: 'Slash', metaKey: true }))).toBe('Mod+/');
    });
  });

  describe('matchesBinding', () => {
    it('matches the same canonical string regardless of case', () => {
      expect(matchesBinding(ev({ key: 'k', code: 'KeyK', metaKey: true }), 'mod+k')).toBe(true);
    });

    it('does not match when modifiers differ', () => {
      expect(matchesBinding(ev({ key: 'k', code: 'KeyK' }), 'Mod+K')).toBe(false);
    });
  });

  describe('formatBinding', () => {
    it('renders an arrow glyph for ArrowLeft', () => {
      expect(formatBinding('ArrowLeft')).toContain('←');
    });

    it('returns Space as-is', () => {
      expect(formatBinding('Space')).toBe('Space');
    });
  });

  describe('DEFAULT_SHORTCUTS', () => {
    it('has a binding for every action', () => {
      const required = ['playPause', 'next', 'previous', 'shuffle', 'repeat', 'mute', 'openFiles', 'search'];
      for (const action of required) {
        expect(DEFAULT_SHORTCUTS).toHaveProperty(action);
        expect(DEFAULT_SHORTCUTS[action as keyof typeof DEFAULT_SHORTCUTS]).toBeTruthy();
      }
    });

    it('uses the requested letter bindings', () => {
      expect(DEFAULT_SHORTCUTS.next).toBe('N');
      expect(DEFAULT_SHORTCUTS.previous).toBe('P');
      expect(DEFAULT_SHORTCUTS.mute).toBe('M');
      expect(DEFAULT_SHORTCUTS.search).toBe('Mod+/');
    });
  });
});
