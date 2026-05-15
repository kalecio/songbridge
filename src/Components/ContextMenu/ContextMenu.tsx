import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Divider, Item, ItemIcon, ItemLabel, Menu } from './styles';

export type ContextMenuItem =
  | {
      type?: 'item';
      label: string;
      icon?: React.ReactNode;
      onSelect: () => void;
      disabled?: boolean;
      danger?: boolean;
    }
  | { type: 'divider' };

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const VIEWPORT_PADDING = 8;

const ContextMenu = ({ x, y, items, onClose }: Props) => {
  const menuRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ x, y });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { innerWidth, innerHeight } = window;
    const rect = el.getBoundingClientRect();
    let nextX = x;
    let nextY = y;
    if (x + rect.width > innerWidth - VIEWPORT_PADDING) {
      nextX = Math.max(VIEWPORT_PADDING, innerWidth - rect.width - VIEWPORT_PADDING);
    }
    if (y + rect.height > innerHeight - VIEWPORT_PADDING) {
      nextY = Math.max(VIEWPORT_PADDING, innerHeight - rect.height - VIEWPORT_PADDING);
    }
    setPosition({ x: nextX, y: nextY });
  }, [x, y, items]);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScroll = () => onClose();
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [onClose]);

  const select = (item: Exclude<ContextMenuItem, { type: 'divider' }>) => {
    if (item.disabled) return;
    item.onSelect();
    onClose();
  };

  return createPortal(
    <Menu ref={menuRef} $x={position.x} $y={position.y} role="menu" onContextMenu={(e) => e.preventDefault()}>
      {items.map((item, i) => {
        if (item.type === 'divider') {
          return <Divider key={`divider-${i}`} role="separator" />;
        }
        return (
          <Item
            key={item.label}
            role="menuitem"
            tabIndex={item.disabled ? -1 : 0}
            aria-disabled={item.disabled || undefined}
            $disabled={item.disabled}
            $danger={item.danger}
            onClick={() => select(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select(item);
              }
            }}
          >
            {item.icon && <ItemIcon>{item.icon}</ItemIcon>}
            <ItemLabel>{item.label}</ItemLabel>
          </Item>
        );
      })}
    </Menu>,
    document.body,
  );
};

export default ContextMenu;
