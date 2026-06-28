import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { parseLrc, getActiveIndex, LrcLine, LrcParseResult } from '../../utils/lrcParser';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import { error as logError } from '../../logger';
import { LyricsContainer, LyricLine, PlainLyricLine } from './styles';

const Lyrics = () => {
  const { currentPath: path, progress, metadata, isPlaying } = useContext(AppContext);
  const [lines, setLines] = useState<LrcLine[]>([]);
  const [isPlainText, setIsPlainText] = useState(false);
  const [hasLrc, setHasLrc] = useState<boolean | null>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);

  const durationSeconds = metadata?.duration?.duration_seconds ?? 0;

  // Anchor point updated whenever the polled progress arrives from the backend.
  const anchorRef = useRef({ seconds: 0, at: performance.now() });
  const [currentSeconds, setCurrentSeconds] = useState(0);

  // Re-anchor whenever the polled progress value changes.
  useEffect(() => {
    if (durationSeconds <= 0) return;
    const seconds = (progress / 100) * durationSeconds;
    anchorRef.current = { seconds, at: performance.now() };
    setCurrentSeconds(seconds);
  }, [progress, durationSeconds]);

  // While playing, interpolate at 200 ms so the active line stays in sync
  // between the 1-second backend polls without extra IPC calls.
  useEffect(() => {
    if (!isPlaying || durationSeconds <= 0) return;
    const id = window.setInterval(() => {
      const { seconds, at } = anchorRef.current;
      const elapsed = (performance.now() - at) / 1000;
      setCurrentSeconds(Math.min(seconds + elapsed, durationSeconds));
    }, 200);
    return () => window.clearInterval(id);
  }, [isPlaying, durationSeconds]);

  // Compensate for IPC round-trip and React render latency.
  const activeIndex = getActiveIndex(lines, currentSeconds + 0.9);

  useEffect(() => {
    if (!path) {
      setLines([]);
      setIsPlainText(false);
      setHasLrc(null);
      return;
    }
    invoke<string | null>('read_lrc_file', { path })
      .then((content) => {
        if (content == null) {
          setHasLrc(false);
          setLines([]);
          setIsPlainText(false);
          return;
        }
        const result: LrcParseResult = parseLrc(content);
        setHasLrc(true);
        setIsPlainText(result.isPlainText);
        setLines(result.lines);
      })
      .catch((err) => {
        logError(`Failed to read LRC file: ${err}`).catch(() => {});
        setHasLrc(false);
        setLines([]);
        setIsPlainText(false);
      });
  }, [path]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  const handleSeek = useCallback(
    (timeSeconds: number) => {
      if (!path || durationSeconds <= 0) return;
      const percent = Math.max(0, Math.min(1, timeSeconds / durationSeconds));
      invoke('seek', { percent, path }).catch((err) => logError(`Seek failed: ${err}`).catch(() => {}));
    },
    [path, durationSeconds],
  );

  if (!path) return <StatusMessage>No song playing</StatusMessage>;
  if (hasLrc === false) return <StatusMessage>No lyrics found for this song</StatusMessage>;
  if (hasLrc === null || lines.length === 0) return null;

  if (isPlainText) {
    return (
      <LyricsContainer>
        {lines.map((line, i) => (
          <PlainLyricLine key={`${line.time}-${i}`}>{line.text}</PlainLyricLine>
        ))}
      </LyricsContainer>
    );
  }

  return (
    <LyricsContainer>
      {lines.map((line, i) => (
        <LyricLine
          key={`${line.time}-${i}`}
          $active={i === activeIndex}
          ref={i === activeIndex ? activeRef : null}
          onClick={() => handleSeek(line.time)}
        >
          {line.text}
        </LyricLine>
      ))}
    </LyricsContainer>
  );
};

export default Lyrics;
