// Lightweight cross-component bridge for triggering playback actions from
// outside the Controls component (e.g. the global keyboard-shortcut handler).
// The Controls component listens for these events and dispatches its existing
// handlers, so we don't have to lift playback state into context.

export const AUDIO_EVENTS = {
  playPause: 'songbridge:playPause',
  next: 'songbridge:next',
  previous: 'songbridge:previous',
  shuffle: 'songbridge:shuffle',
  repeat: 'songbridge:repeat',
  mute: 'songbridge:mute',
} as const;

export type AudioEventName = (typeof AUDIO_EVENTS)[keyof typeof AUDIO_EVENTS];

export const emitAudioEvent = (name: AudioEventName) => {
  window.dispatchEvent(new CustomEvent(name));
};
