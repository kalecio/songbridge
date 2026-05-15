import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronRight } from 'react-icons/fa6';
import { Divider, Item, ItemIcon, ItemLabel, Menu, SubmenuChevron } from './styles';

export type ContextMenuItem =
  | {
      type?: 'item';
      label: string;
      icon?: React.ReactNode;
      onSelect: () => void;
      disabled?: boolean;
      danger?: boolean;
    }
  | { type: 'divider' }
  | {
      type: 'submenu';
      label: string;
      icon?: React.ReactNode;
      items: ContextMenuItem[];
      disabled?: boolean;
    };

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  /** Fires when any leaf item in this menu or a nested submenu is activated.
   * Used by parent menus to close the whole chain on a leaf selection. */
  onItemSelected?: () => void;
  /** Internal hooks the parent uses to cancel/schedule its own submenu close
   * timer based on hover over a nested submenu's surface. */
  onMenuMouseEnter?: () => void;
  onMenuMouseLeave?: () => void;
}

const VIEWPORT_PADDING = 8;
const SUBMENU_CLOSE_DELAY = 250;
const MENU_ROOT_ATTR = 'data-context-menu-root';

interface SubmenuState {
  items: ContextMenuItem[];
  x: number;
  y: number;
  key: string;
}

const ContextMenu = ({ x, y, items, onClose, onItemSelected, onMenuMouseEnter, onMenuMouseLeave }: Props) => {
  const menuRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ x, y });
  const [submenu, setSubmenu] = useState<SubmenuState | null>(null);
  const closeTimerRef = useRef<number | null>(null);

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
      // Clicks anywhere inside the menu chain (this menu or any nested submenu
      // portal) count as "inside" so opening a submenu doesn't dismiss the root.
      const target = e.target as Element | null;
      if (target?.closest(`[${MENU_ROOT_ATTR}]`)) return;
      onClose();
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

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setSubmenu(null), SUBMENU_CLOSE_DELAY);
  };

  const select = (item: Extract<ContextMenuItem, { type?: 'item' }>) => {
    if (item.disabled) return;
    item.onSelect();
    onClose();
    onItemSelected?.();
  };

  const openSubmenu = (item: Extract<ContextMenuItem, { type: 'submenu' }>, anchor: HTMLElement) => {
    if (item.disabled) return;
    cancelClose();
    const rect = anchor.getBoundingClientRect();
    setSubmenu({ items: item.items, x: rect.right, y: rect.top, key: item.label });
  };

  return (
    <>
      {createPortal(
        <Menu
          ref={menuRef}
          $x={position.x}
          $y={position.y}
          role="menu"
          onMouseEnter={() => {
            cancelClose();
            onMenuMouseEnter?.();
          }}
          onMouseLeave={() => {
            scheduleClose();
            onMenuMouseLeave?.();
          }}
          onContextMenu={(e) => e.preventDefault()}
          {...{ [MENU_ROOT_ATTR]: '' }}
        >
          {items.map((item, i) => {
            if (item.type === 'divider') {
              return <Divider key={`divider-${i}`} role="separator" />;
            }
            if (item.type === 'submenu') {
              const isOpen = submenu?.key === item.label;
              return (
                <Item
                  key={item.label}
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  tabIndex={item.disabled ? -1 : 0}
                  aria-disabled={item.disabled || undefined}
                  $disabled={item.disabled}
                  onMouseEnter={(e) => openSubmenu(item, e.currentTarget as HTMLElement)}
                  onFocus={(e) => openSubmenu(item, e.currentTarget as HTMLElement)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'Enter') {
                      e.preventDefault();
                      openSubmenu(item, e.currentTarget as HTMLElement);
                    }
                  }}
                >
                  {item.icon && <ItemIcon>{item.icon}</ItemIcon>}
                  <ItemLabel>{item.label}</ItemLabel>
                  <SubmenuChevron aria-hidden="true">
                    <FaChevronRight />
                  </SubmenuChevron>
                </Item>
              );
            }
            return (
              <Item
                key={item.label}
                role="menuitem"
                tabIndex={item.disabled ? -1 : 0}
                aria-disabled={item.disabled || undefined}
                $disabled={item.disabled}
                $danger={item.danger}
                onMouseEnter={scheduleClose}
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
      )}
      {submenu && (
        <ContextMenu
          x={submenu.x}
          y={submenu.y}
          items={submenu.items}
          onClose={() => setSubmenu(null)}
          onItemSelected={() => {
            setSubmenu(null);
            onClose();
            onItemSelected?.();
          }}
          onMenuMouseEnter={cancelClose}
          onMenuMouseLeave={scheduleClose}
        />
      )}
    </>
  );
};

export default ContextMenu;
