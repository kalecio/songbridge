import { fireEvent } from '@testing-library/react';
import Modal from './Modal';
import { renderWithContext } from '../../test/helpers';

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { queryByRole } = renderWithContext(
      <Modal isOpen={false} onClose={vi.fn()} title="Hidden">
        body
      </Modal>,
    );
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the title, body, and footer when open', () => {
    const { getByText, getByRole } = renderWithContext(
      <Modal isOpen onClose={vi.fn()} title="My Title" footer={<button type="button">OK</button>}>
        Hello world
      </Modal>,
    );
    expect(getByRole('dialog')).toBeInTheDocument();
    expect(getByText('My Title')).toBeInTheDocument();
    expect(getByText('Hello world')).toBeInTheDocument();
    expect(getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('closes when Escape is pressed', () => {
    const onClose = vi.fn();
    renderWithContext(
      <Modal isOpen onClose={onClose} title="X">
        body
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked outside the surface', () => {
    const onClose = vi.fn();
    const { getByRole } = renderWithContext(
      <Modal isOpen onClose={onClose} title="X">
        body
      </Modal>,
    );
    // Mousedown directly on the backdrop (the presentation element) — not on the dialog surface.
    const backdrop = getByRole('presentation');
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the surface', () => {
    const onClose = vi.fn();
    const { getByText } = renderWithContext(
      <Modal isOpen onClose={onClose} title="X">
        body
      </Modal>,
    );
    fireEvent.mouseDown(getByText('body'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close on Escape or backdrop when dismissible is false', () => {
    const onClose = vi.fn();
    const { getByRole } = renderWithContext(
      <Modal isOpen onClose={onClose} title="X" dismissible={false}>
        body
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(getByRole('presentation'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
