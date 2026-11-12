import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { styled } from 'styled-components';

interface TextMarqueeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  hoverOnly?: boolean;
}

const Viewport = styled.span`
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;

  .text-marquee__track {
    display: inline-flex;
    width: max-content;
    gap: 1.5rem;
    transform: translateX(0);
  }

  &[data-overflow='true'][data-hover-only='false'] .text-marquee__track {
    animation: text-marquee-scroll var(--marquee-duration) linear infinite;
  }

  &[data-overflow='true'][data-hover-only='true']:hover .text-marquee__track,
  &[data-overflow='true'][data-hover-only='true']:focus-within .text-marquee__track {
    animation: text-marquee-scroll var(--marquee-duration) linear infinite;
  }

  &[data-hover-only='false']:hover .text-marquee__track,
  &[data-hover-only='false']:focus-within .text-marquee__track {
    animation-play-state: paused;
  }

  @keyframes text-marquee-scroll {
    0%,
    12% {
      transform: translateX(0);
    }
    88%,
    100% {
      transform: translateX(calc(-1 * var(--marquee-distance)));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &[data-overflow='true'] {
      overflow-x: auto;
      scrollbar-width: none;
    }

    &[data-overflow='true']::-webkit-scrollbar {
      display: none;
    }

    &[data-overflow='true'] .text-marquee__track {
      animation: none;
    }
  }
`;

const TextMarquee = ({ children, className, style, hoverOnly = false, ...props }: TextMarqueeProps) => {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [metrics, setMetrics] = useState({ textWidth: 0, viewportWidth: 0 });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const text = textRef.current;
    if (!viewport || !text) return;

    const measure = () => {
      const nextMetrics = { textWidth: text.scrollWidth, viewportWidth: viewport.clientWidth };
      setMetrics((current) =>
        current.textWidth === nextMetrics.textWidth && current.viewportWidth === nextMetrics.viewportWidth
          ? current
          : nextMetrics,
      );
    };

    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(text);
    return () => observer.disconnect();
  }, [children]);

  const gap = 24;
  const isOverflowing = metrics.textWidth > metrics.viewportWidth;
  const scrollDistance = metrics.textWidth + gap;
  const duration = Math.max(8, scrollDistance / 24 + 2);
  const marqueeStyle = {
    ...style,
    '--marquee-distance': `${scrollDistance}px`,
    '--marquee-duration': `${duration}s`,
  } as CSSProperties;

  return (
    <Viewport
      {...props}
      ref={viewportRef}
      style={marqueeStyle}
      data-overflow={isOverflowing}
      data-hover-only={hoverOnly}
      className={className}
    >
      <span className="text-marquee__track">
        <span ref={textRef}>{children}</span>
        {isOverflowing && <span aria-hidden="true">{children}</span>}
      </span>
    </Viewport>
  );
};

export default TextMarquee;
