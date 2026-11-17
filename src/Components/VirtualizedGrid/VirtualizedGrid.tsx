import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Props<T> {
  items: T[];
  getItemKey: (_item: T) => string;
  renderItem: (_item: T) => ReactNode;
}

const VirtualizedGrid = <T,>({ items, getItemKey, renderItem }: Props<T>) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(() => (window.innerWidth <= 760 ? 2 : 4));

  useEffect(() => {
    const element = parentRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setColumns(entry.contentRect.width <= 760 ? 2 : 4);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil(items.length / columns);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 340,
    overscan: 3,
    getItemKey: (index) => (items[index * columns] ? getItemKey(items[index * columns]) : index),
  });

  if (items.length <= 100) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 'clamp(16px, 1.5vw, 28px)',
          alignItems: 'start',
        }}
      >
        {items.map((item) => (
          <div key={getItemKey(item)}>{renderItem(item)}</div>
        ))}
      </div>
    );
  }

  return (
    <div ref={parentRef} style={{ height: 'calc(100vh - 260px)', minHeight: 240, overflowY: 'auto', width: '100%' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const rowItems = items.slice(row.index * columns, (row.index + 1) * columns);
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${row.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: 'clamp(16px, 1.5vw, 28px)',
                paddingBottom: 28,
                boxSizing: 'border-box',
                alignItems: 'start',
              }}
            >
              {rowItems.map((item) => (
                <div key={getItemKey(item)}>{renderItem(item)}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedGrid;
