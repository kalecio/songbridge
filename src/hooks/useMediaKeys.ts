import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { AUDIO_EVENTS, AudioEventName, emitAudioEvent } from '../audioEvents';

// Media-key bridge. The Rust side (souvlaki) registers Songbridge with the OS
// media-control surface — `MPRemoteCommandCenter` on macOS, MPRIS on Linux,
// `SystemMediaTransportControls` on Windows — and re-emits hardware media-key
// presses as Tauri events. This hook fans them into our existing AUDIO_EVENTS
// so Controls.tsx picks them up the same way as in-app keyboard shortcuts.
const TAURI_TO_AUDIO: Array<{ tauri: string; audio: AudioEventName }> = [
  { tauri: 'media-key:play-pause', audio: AUDIO_EVENTS.playPause },
  { tauri: 'media-key:next', audio: AUDIO_EVENTS.next },
  { tauri: 'media-key:previous', audio: AUDIO_EVENTS.previous },
];

/**
 * @param onSeek Called when the user drags the OS now-playing scrubber.
 *               The argument is the absolute target position in seconds.
 *               Use the latest known duration to convert it to a 0–1 ratio
 *               and feed it into the existing seek pipeline.
 */
export const useMediaKeys = (onSeek?: (_seconds: number) => void) => {
  // Keep the seek callback in a ref so we don't re-bind the listeners every
  // time the duration / handler closure changes.
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  useEffect(() => {
    const unlistens: UnlistenFn[] = [];
    let cancelled = false;

    const setup = async () => {
      try {
        for (const { tauri, audio } of TAURI_TO_AUDIO) {
          const unlisten = await listen(tauri, () => emitAudioEvent(audio));
          if (cancelled) unlisten();
          else unlistens.push(unlisten);
        }
        const seekUnlisten = await listen<number>('media-key:seek', (e) => {
          onSeekRef.current?.(e.payload);
        });
        if (cancelled) seekUnlisten();
        else unlistens.push(seekUnlisten);
      } catch {
        // Running outside Tauri (e.g. unit tests) — listen() rejects.
        // No backend to bridge to, so silently no-op.
      }
    };
    setup();

    return () => {
      cancelled = true;
      unlistens.forEach((u) => u());
    };
  }, []);
};
