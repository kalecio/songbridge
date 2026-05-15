import { fireEvent } from '@testing-library/react';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import { renderWithContext } from '../../test/helpers';

const baseItems: ContextMenuItem[] = [
  { label: 'Play next', onSelect: vi.fn() },
  { label: 'Add to queue', onSelect: vi.fn() },
  { type: 'divider' },
  { label: 'Remove', onSelect: vi.fn(), danger: true },
];

describe('ContextMenu', () => {
  it('renders all item labels', () => {
    const { getByText } = renderWithContext(<ContextMenu x={10} y={10} items={baseItems} onClose={vi.fn()} />);
    expect(getByText('Play next')).toBeInTheDocument();
    expect(getByText('Add to queue')).toBeInTheDocument();
    expect(getByText('Remove')).toBeInTheDocument();
  });

  it('renders a separator for divider items', () => {
    const { getByRole } = renderWithContext(<ContextMenu x={0} y={0} items={baseItems} onClose={vi.fn()} />);
    expect(getByRole('separator')).toBeInTheDocument();
  });

  it('calls the item onSelect and then onClose when clicked', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const items: ContextMenuItem[] = [{ label: 'Play next', onSelect }];
    const { getByText } = renderWithContext(<ContextMenu x={0} y={0} items={items} onClose={onClose} />);
    fireEvent.click(getByText('Play next'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onSelect for disabled items', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const items: ContextMenuItem[] = [{ label: 'Disabled', onSelect, disabled: true }];
    const { getByText } = renderWithContext(<ContextMenu x={0} y={0} items={items} onClose={onClose} />);
    fireEvent.click(getByText('Disabled'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when the Escape key is pressed', () => {
    const onClose = vi.fn();
    renderWithContext(<ContextMenu x={0} y={0} items={baseItems} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking outside the menu', () => {
    const onClose = vi.fn();
    renderWithContext(<ContextMenu x={0} y={0} items={baseItems} onClose={onClose} />);
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('activates an item via the Enter key', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const items: ContextMenuItem[] = [{ label: 'Play next', onSelect }];
    const { getByText } = renderWithContext(<ContextMenu x={0} y={0} items={items} onClose={onClose} />);
    fireEvent.keyDown(getByText('Play next'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('submenu', () => {
    const buildItems = (childOnSelect: () => void): ContextMenuItem[] => [
      { label: 'Play next', onSelect: vi.fn() },
      {
        type: 'submenu',
        label: 'Add to playlist',
        items: [
          { label: 'Create new playlist', onSelect: vi.fn() },
          { type: 'divider' },
          { label: 'Chill Mix', onSelect: childOnSelect },
        ],
      },
    ];

    it('renders submenu items with aria-haspopup', () => {
      const { getByText } = renderWithContext(
        <ContextMenu x={0} y={0} items={buildItems(vi.fn())} onClose={vi.fn()} />,
      );
      const submenuItem = getByText('Add to playlist').closest('[role="menuitem"]');
      expect(submenuItem).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('opens the submenu on hover and renders its items', () => {
      const { getByText, queryByText } = renderWithContext(
        <ContextMenu x={0} y={0} items={buildItems(vi.fn())} onClose={vi.fn()} />,
      );
      expect(queryByText('Chill Mix')).not.toBeInTheDocument();
      fireEvent.mouseEnter(getByText('Add to playlist'));
      expect(queryByText('Chill Mix')).toBeInTheDocument();
      expect(queryByText('Create new playlist')).toBeInTheDocument();
    });

    it('clicking a submenu leaf fires its onSelect and closes the whole chain', () => {
      const onSelect = vi.fn();
      const onClose = vi.fn();
      const { getByText } = renderWithContext(
        <ContextMenu x={0} y={0} items={buildItems(onSelect)} onClose={onClose} />,
      );
      fireEvent.mouseEnter(getByText('Add to playlist'));
      fireEvent.click(getByText('Chill Mix'));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('clicking inside an open submenu does not close the root', () => {
      const onClose = vi.fn();
      const { getByText } = renderWithContext(
        <ContextMenu x={0} y={0} items={buildItems(vi.fn())} onClose={onClose} />,
      );
      fireEvent.mouseEnter(getByText('Add to playlist'));
      // Clicking inside the submenu DOM should not trigger the root's outside-click handler.
      fireEvent.mouseDown(getByText('Create new playlist'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not open a disabled submenu', () => {
      const items: ContextMenuItem[] = [
        {
          type: 'submenu',
          label: 'Add to playlist',
          disabled: true,
          items: [{ label: 'Inner', onSelect: vi.fn() }],
        },
      ];
      const { getByText, queryByText } = renderWithContext(<ContextMenu x={0} y={0} items={items} onClose={vi.fn()} />);
      fireEvent.mouseEnter(getByText('Add to playlist'));
      expect(queryByText('Inner')).not.toBeInTheDocument();
    });
  });
});
