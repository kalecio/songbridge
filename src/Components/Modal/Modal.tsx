import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Backdrop, Body, Footer, Header, Surface, Title } from './styles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  dismissible?: boolean;
  labelledBy?: string;
}

const TITLE_ID = 'modal-title';

const Modal = ({ isOpen, onClose, title, children, footer, dismissible = true, labelledBy }: Props) => {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, dismissible, onClose]);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (!dismissible) return;
    if (surfaceRef.current && !surfaceRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return createPortal(
    <Backdrop role="presentation" onMouseDown={handleBackdropMouseDown}>
      <Surface
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? (title ? TITLE_ID : undefined)}
      >
        {title && (
          <Header>
            <Title id={TITLE_ID}>{title}</Title>
          </Header>
        )}
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Surface>
    </Backdrop>,
    document.body,
  );
};

export default Modal;
