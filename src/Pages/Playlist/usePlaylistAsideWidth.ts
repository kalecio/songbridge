import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

const STORAGE_KEY = 'songbridge.playlistAsideWidth';
const MIN_WIDTH = 210;
const maxWidthForWindow = () => Math.max(MIN_WIDTH, Math.min(420, window.innerWidth - 680));
const clampWidth = (width: number) => Math.round(Math.max(MIN_WIDTH, Math.min(maxWidthForWindow(), width)));

export function usePlaylistAsideWidth() {
  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(saved) && saved >= MIN_WIDTH) return clampWidth(saved);
    } catch {
      // Storage is optional; use the default size when unavailable.
    }
    return clampWidth(240);
  });
  const [maxWidth, setMaxWidth] = useState(maxWidthForWindow);
  const [isResizing, setIsResizing] = useState(false);
  const dragging = useRef(false);
  const left = useRef(0);
  const latestWidth = useRef(width);

  const updateWidth = (value: number) => {
    const next = clampWidth(value);
    latestWidth.current = next;
    setWidth(next);
  };
  const saveWidth = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(latestWidth.current));
    } catch {
      // Resizing still works when storage is unavailable.
    }
  };

  useEffect(() => {
    const onResize = () => {
      const nextMax = maxWidthForWindow();
      setMaxWidth(nextMax);
      latestWidth.current = Math.min(nextMax, latestWidth.current);
      setWidth(latestWidth.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const finishResize = (event: PointerEvent<HTMLElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    saveWidth();
  };

  return {
    width,
    maxWidth,
    isResizing,
    handleProps: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        left.current = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
        dragging.current = true;
        setIsResizing(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus();
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (dragging.current) updateWidth(event.clientX - left.current);
      },
      onPointerUp: finishResize,
      onPointerCancel: finishResize,
      onLostPointerCapture: () => {
        dragging.current = false;
        setIsResizing(false);
        saveWidth();
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        const values: Record<string, number> = {
          ArrowLeft: width - 10,
          ArrowRight: width + 10,
          Home: MIN_WIDTH,
          End: maxWidth,
        };
        if (event.key in values) {
          event.preventDefault();
          updateWidth(values[event.key]);
          saveWidth();
        }
      },
    },
  };
}
