import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Modal from '../Components/Modal/Modal';
import { Button, Input, Message } from '../Components/Modal/styles';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface PromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ModalApi {
  confirm: (_opts: ConfirmOptions) => Promise<boolean>;
  prompt: (_opts: PromptOptions) => Promise<string | null>;
}

// Default: no provider mounted (e.g. in unit tests that don't exercise modals).
// Resolve to a cancel-equivalent so callers can `await` without blocking.
const ModalContext = createContext<ModalApi>({
  confirm: () => Promise.resolve(false),
  prompt: () => Promise.resolve(null),
});

type State =
  | { kind: 'none' }
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (_v: boolean) => void }
  | { kind: 'prompt'; opts: PromptOptions; resolve: (_v: string | null) => void };

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<State>({ kind: 'none' });
  const [promptValue, setPromptValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((result: boolean | string | null) => {
    setState((current) => {
      if (current.kind === 'confirm') current.resolve(result === true);
      else if (current.kind === 'prompt') current.resolve(typeof result === 'string' ? result : null);
      return { kind: 'none' };
    });
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ kind: 'confirm', opts, resolve });
      }),
    [],
  );

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setPromptValue(opts.defaultValue ?? '');
        setState({ kind: 'prompt', opts, resolve });
      }),
    [],
  );

  useEffect(() => {
    if (state.kind === 'prompt') {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (state.kind === 'confirm') {
      confirmButtonRef.current?.focus();
    }
  }, [state.kind]);

  const renderConfirm = (opts: ConfirmOptions) => (
    <Modal isOpen title={opts.title} onClose={() => close(false)}>
      {opts.message && <Message>{opts.message}</Message>}
      <ModalActions>
        <Button type="button" $variant="ghost" onClick={() => close(false)}>
          {opts.cancelLabel ?? 'Cancel'}
        </Button>
        <Button
          ref={confirmButtonRef}
          type="button"
          $variant={opts.danger ? 'danger' : 'primary'}
          onClick={() => close(true)}
        >
          {opts.confirmLabel ?? 'OK'}
        </Button>
      </ModalActions>
    </Modal>
  );

  const renderPrompt = (opts: PromptOptions) => {
    const submit = () => close(promptValue);
    return (
      <Modal isOpen title={opts.title} onClose={() => close(null)}>
        {opts.message && <Message>{opts.message}</Message>}
        <Input
          ref={inputRef}
          value={promptValue}
          placeholder={opts.placeholder}
          onChange={(e) => setPromptValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        <ModalActions>
          <Button type="button" $variant="ghost" onClick={() => close(null)}>
            {opts.cancelLabel ?? 'Cancel'}
          </Button>
          <Button type="button" $variant="primary" onClick={submit}>
            {opts.confirmLabel ?? 'OK'}
          </Button>
        </ModalActions>
      </Modal>
    );
  };

  return (
    <ModalContext.Provider value={{ confirm, prompt }}>
      {children}
      {state.kind === 'confirm' && renderConfirm(state.opts)}
      {state.kind === 'prompt' && renderPrompt(state.opts)}
    </ModalContext.Provider>
  );
};

const ModalActions = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>{children}</div>
);

export const useModal = () => useContext(ModalContext);
