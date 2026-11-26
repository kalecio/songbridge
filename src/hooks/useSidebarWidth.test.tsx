import { fireEvent } from '@testing-library/react';
import { renderWithContext } from '../test/helpers';
import Sidebar from '../Components/Sidebar/Sidebar';
import { SIDEBAR_WIDTH_KEY } from './useSidebarWidth';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }));
const originalWidth = window.innerWidth;
beforeEach(() => {
  localStorage.removeItem(SIDEBAR_WIDTH_KEY);
  Object.defineProperty(window, 'innerWidth', { value: 1400, configurable: true });
});
afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
  localStorage.removeItem(SIDEBAR_WIDTH_KEY);
  vi.unstubAllGlobals();
});
it('supports keyboard resizing, clamps both limits, and restores the saved width', () => {
  const first = renderWithContext(<Sidebar />);
  const divider = first.getByRole('separator', { name: 'Sidebar width' });
  fireEvent.keyDown(divider, { key: 'Home' });
  expect(divider).toHaveAttribute('aria-valuenow', '175');
  fireEvent.keyDown(divider, { key: 'ArrowLeft' });
  expect(divider).toHaveAttribute('aria-valuenow', '175');
  fireEvent.keyDown(divider, { key: 'End' });
  expect(divider).toHaveAttribute('aria-valuenow', '360');
  fireEvent.keyDown(divider, { key: 'ArrowRight' });
  expect(divider).toHaveAttribute('aria-valuenow', '360');
  first.unmount();
  expect(renderWithContext(<Sidebar />).getByRole('separator')).toHaveAttribute('aria-valuenow', '360');
});
it('keeps room for the library when the window becomes narrower', () => {
  localStorage.setItem(SIDEBAR_WIDTH_KEY, '350');
  const { getByRole } = renderWithContext(<Sidebar />);
  Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true });
  fireEvent(window, new Event('resize'));
  expect(getByRole('separator')).toHaveAttribute('aria-valuemax', '220');
  expect(getByRole('separator')).toHaveAttribute('aria-valuenow', '220');
});
it('drags with pointer capture, persists the width, and stops resizing after release', () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  const { getByRole } = renderWithContext(<Sidebar />);
  const divider = getByRole('separator');
  divider.setPointerCapture = vi.fn();
  divider.hasPointerCapture = vi.fn().mockReturnValue(true);
  divider.releasePointerCapture = vi.fn();
  fireEvent.pointerDown(divider, { button: 0, clientX: 200 });
  fireEvent.pointerMove(divider, { clientX: 300 });
  expect(divider).toHaveAttribute('aria-valuenow', '300');
  fireEvent.pointerUp(divider);
  fireEvent.pointerMove(divider, { clientX: 100 });
  expect(divider).toHaveAttribute('aria-valuenow', '300');
  expect(localStorage.getItem(SIDEBAR_WIDTH_KEY)).toBe('300');
});
it('ignores corrupt saved preferences', () => {
  localStorage.setItem(SIDEBAR_WIDTH_KEY, 'not-a-width');
  expect(
    Number(
      renderWithContext(<Sidebar />)
        .getByRole('separator')
        .getAttribute('aria-valuenow'),
    ),
  ).toBeGreaterThanOrEqual(175);
});
