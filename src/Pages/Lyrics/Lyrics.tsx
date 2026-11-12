import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { parseLrc, getActiveIndex, LrcLine, LrcParseResult } from '../../utils/lrcParser';
import StatusMessage from '../../Components/StatusMessage/StatusMessage';
import { error as logError } from '../../logger';
import { useLyricsSearchModal } from '../../Context/LyricsSearchModalContext';
import { LYRICS_UPDATED_EVENT } from '../../lyricsEvents';
import { useLyricsFontSize } from '../../hooks/useLyricsFontSize';
import { LyricsPage, LyricsContainer, LyricLine, PlainLyricLine, EmptyLyricsState, FindLyricsButton } from './styles';
import { useI18n } from '../../i18n/I18nProvider';

const Lyrics = () => {
  const { t } = useI18n();
  const { currentPath: path, progress, metadata, isPlaying, library } = useContext(AppContext);
  const { open: openLyricsSearch } = useLyricsSearchModal();
  const [lines, setLines] = useState<LrcLine[]>([]);
  const [isPlainText, setIsPlainText] = useState(false);
  const [hasLrc, setHasLrc] = useState<boolean | null>(null);
  const { fontSize } = useLyricsFontSize();
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
    let disposed = false;
    let request = 0;
    const load = async () => {
      const currentRequest = ++request;
      setLines([]);
      setIsPlainText(false);
      setHasLrc(null);
      if (!path) return;
      try {
        const content = await invoke<string | null>('read_lrc_file', { path });
        if (disposed || currentRequest !== request) return;
        const result: LrcParseResult = parseLrc(content ?? '');
        setHasLrc(result.lines.length > 0);
        setIsPlainText(result.isPlainText);
        setLines(result.lines);
      } catch (err) {
        if (disposed || currentRequest !== request) return;
        logError(`Failed to read LRC file: ${err}`).catch(() => {});
        setHasLrc(false);
      }
    };
    const onLyricsUpdated = (event: Event) => {
      if ((event as CustomEvent<string>).detail === path) void load();
    };
    window.addEventListener(LYRICS_UPDATED_EVENT, onLyricsUpdated);
    void load();
    return () => {
      disposed = true;
      window.removeEventListener(LYRICS_UPDATED_EVENT, onLyricsUpdated);
    };
  }, [path]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex, fontSize]);

  const handleSeek = useCallback(
    (timeSeconds: number) => {
      if (!path || durationSeconds <= 0) return;
      const percent = Math.max(0, Math.min(1, timeSeconds / durationSeconds));
      invoke('seek', { percent, path }).catch((err) => logError(`Seek failed: ${err}`).catch(() => {}));
    },
    [path, durationSeconds],
  );

  return (
    <LyricsPage aria-label={t('common.lyrics')}>
      <LyricsContainer style={{ fontSize }}>
        {!path ? (
          <StatusMessage>{t('lyrics.noSongPlaying')}</StatusMessage>
        ) : hasLrc === false ? (
          <EmptyLyricsState>
            <StatusMessage>{t('lyrics.notFound')}</StatusMessage>
            <p>{t('lyrics.findAndDownload')}</p>
            <FindLyricsButton
              type="button"
              onClick={() => openLyricsSearch(library.find((song) => song.path === path) ?? { ...metadata, path })}
            >
              {t('lyrics.find')}
            </FindLyricsButton>
          </EmptyLyricsState>
        ) : hasLrc === null ? (
          <StatusMessage>{t('common.loading')}</StatusMessage>
        ) : (
          lines.map((line, i) =>
            isPlainText ? (
              <PlainLyricLine key={`${line.time}-${i}`}>{line.text}</PlainLyricLine>
            ) : (
              <LyricLine
                key={`${line.time}-${i}`}
                $active={i === activeIndex}
                ref={i === activeIndex ? activeRef : null}
                onClick={() => handleSeek(line.time)}
              >
                {line.text}
              </LyricLine>
            ),
          )
        )}
      </LyricsContainer>
    </LyricsPage>
  );
};

export default Lyrics;
