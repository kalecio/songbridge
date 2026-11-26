import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';

export const SIDEBAR_WIDTH_KEY = 'songbridge.sidebarWidth';
export const SIDEBAR_MIN_WIDTH = 175;
const maximum = () => Math.min(360, Math.max(SIDEBAR_MIN_WIDTH, window.innerWidth - 680));
const clamp = (width: number) => Math.round(Math.max(SIDEBAR_MIN_WIDTH, Math.min(maximum(), width)));

export function useSidebarWidth() {
  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
      if (Number.isFinite(saved) && saved >= SIDEBAR_MIN_WIDTH) return clamp(saved);
    } catch {
      /* Private mode may disable storage. */
    }
    return clamp(window.innerWidth * 0.162);
  });
  const [maxWidth, setMaxWidth] = useState(maximum);
  const dragging = useRef(false);
  const origin = useRef(0);
  const latest = useRef(width);
  const [isResizing, setIsResizing] = useState(false);
  const update = (value: number) => {
    latest.current = clamp(value);
    setWidth(latest.current);
  };
  const save = () => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(latest.current));
    } catch {
      /* Optional preference. */
    }
  };
  useEffect(() => {
    const onResize = () => {
      setMaxWidth(maximum());
      latest.current = clamp(latest.current);
      setWidth(latest.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const finish = (event: PointerEvent<HTMLElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsResizing(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    save();
  };
  return {
    width,
    maxWidth,
    isResizing,
    handleProps: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        origin.current = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
        dragging.current = true;
        setIsResizing(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus();
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (dragging.current) update(event.clientX - origin.current);
      },
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: () => {
        dragging.current = false;
        setIsResizing(false);
        save();
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        const values: Record<string, number> = {
          ArrowLeft: width - 10,
          ArrowRight: width + 10,
          Home: SIDEBAR_MIN_WIDTH,
          End: maxWidth,
        };
        if (event.key in values) {
          event.preventDefault();
          update(values[event.key]);
          save();
        }
      },
    },
  };
}
