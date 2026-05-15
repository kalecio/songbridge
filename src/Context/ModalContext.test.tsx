import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { ModalProvider, useModal } from './ModalContext';
import { defaultTheme } from '../theme';

const renderWithProvider = (ui: React.ReactElement) =>
  render(
    <ThemeProvider theme={defaultTheme}>
      <ModalProvider>{ui}</ModalProvider>
    </ThemeProvider>,
  );

describe('ModalProvider — confirm', () => {
  it('resolves to true when the confirm button is clicked', async () => {
    let resultPromise: Promise<boolean> | undefined;
    const Trigger = () => {
      const { confirm } = useModal();
      return (
        <button type="button" onClick={() => (resultPromise = confirm({ title: 'Sure?' }))}>
          go
        </button>
      );
    };
    const { getByText, findByText } = renderWithProvider(<Trigger />);
    act(() => {
      fireEvent.click(getByText('go'));
    });
    await findByText('Sure?');
    act(() => {
      fireEvent.click(getByText('OK'));
    });
    await expect(resultPromise!).resolves.toBe(true);
  });

  it('resolves to false when the cancel button is clicked', async () => {
    let resultPromise: Promise<boolean> | undefined;
    const Trigger = () => {
      const { confirm } = useModal();
      return (
        <button type="button" onClick={() => (resultPromise = confirm({ title: 'Sure?' }))}>
          go
        </button>
      );
    };
    const { getByText, findByText } = renderWithProvider(<Trigger />);
    act(() => {
      fireEvent.click(getByText('go'));
    });
    await findByText('Sure?');
    act(() => {
      fireEvent.click(getByText('Cancel'));
    });
    await expect(resultPromise!).resolves.toBe(false);
  });

  it('resolves to false when Escape closes the modal', async () => {
    let resultPromise: Promise<boolean> | undefined;
    const Trigger = () => {
      const { confirm } = useModal();
      return (
        <button type="button" onClick={() => (resultPromise = confirm({ title: 'Sure?' }))}>
          go
        </button>
      );
    };
    const { getByText, findByText } = renderWithProvider(<Trigger />);
    act(() => {
      fireEvent.click(getByText('go'));
    });
    await findByText('Sure?');
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    await expect(resultPromise!).resolves.toBe(false);
  });

  it('renders custom labels and the danger variant', async () => {
    const Trigger = () => {
      const { confirm } = useModal();
      return (
        <button
          type="button"
          onClick={() => confirm({ title: 'Delete?', confirmLabel: 'Delete', cancelLabel: 'Nope', danger: true })}
        >
          go
        </button>
      );
    };
    const { getByText, findByText } = renderWithProvider(<Trigger />);
    act(() => {
      fireEvent.click(getByText('go'));
    });
    await findByText('Delete?');
    expect(getByText('Delete')).toBeInTheDocument();
    expect(getByText('Nope')).toBeInTheDocument();
  });
});

describe('ModalProvider — prompt', () => {
  it('resolves with the input value when confirmed', async () => {
    let resultPromise: Promise<string | null> | undefined;
    const Trigger = () => {
      const { prompt } = useModal();
      return (
        <button type="button" onClick={() => (resultPromise = prompt({ title: 'Name?', defaultValue: 'old' }))}>
          go
        </button>
      );
    };
    const { getByText, getByDisplayValue, findByText } = renderWithProvider(<Trigger />);
    act(() => {
      fireEvent.click(getByText('go'));
    });
    await findByText('Name?');
    const input = getByDisplayValue('old') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'new' } });
    });
    act(() => {
      fireEvent.click(getByText('OK'));
    });
    await expect(resultPromise!).resolves.toBe('new');
  });

  it('submits on Enter', async () => {
    let resultPromise: Promise<string | null> | undefined;
    const Trigger = () => {
      const { prompt } = useModal();
      return (
        <button type="button" onClick={() => (resultPromise = prompt({ title: 'Name?', defaultValue: 'hi' }))}>
          go
        </button>
      );
    };
    const { getByText, getByDisplayValue, findByText } = renderWithProvider(<Trigger />);
    act(() => {
      fireEvent.click(getByText('go'));
    });
    await findByText('Name?');
    const input = getByDisplayValue('hi');
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    await expect(resultPromise!).resolves.toBe('hi');
  });

  it('resolves to null on cancel', async () => {
    let resultPromise: Promise<string | null> | undefined;
    const Trigger = () => {
      const { prompt } = useModal();
      return (
        <button type="button" onClick={() => (resultPromise = prompt({ title: 'Name?' }))}>
          go
        </button>
      );
    };
    const { getByText, findByText } = renderWithProvider(<Trigger />);
    act(() => {
      fireEvent.click(getByText('go'));
    });
    await findByText('Name?');
    act(() => {
      fireEvent.click(getByText('Cancel'));
    });
    await expect(resultPromise!).resolves.toBeNull();
  });

  it('focuses the input when the prompt opens', async () => {
    const Trigger = () => {
      const { prompt } = useModal();
      return (
        <button type="button" onClick={() => prompt({ title: 'Name?', defaultValue: 'foo' })}>
          go
        </button>
      );
    };
    const { getByText, getByDisplayValue } = renderWithProvider(<Trigger />);
    act(() => {
      fireEvent.click(getByText('go'));
    });
    await waitFor(() => {
      const input = getByDisplayValue('foo');
      expect(document.activeElement).toBe(input);
    });
  });
});

describe('useModal default (no provider)', () => {
  it('returns no-op promises that resolve to cancel-equivalent values', async () => {
    let confirmResult: boolean | undefined;
    let promptResult: string | null | undefined;
    const Probe = () => {
      const { confirm, prompt } = useModal();
      return (
        <button
          type="button"
          onClick={async () => {
            confirmResult = await confirm({ title: 'x' });
            promptResult = await prompt({ title: 'x' });
          }}
        >
          go
        </button>
      );
    };
    const { getByText } = render(<Probe />);
    await act(async () => {
      fireEvent.click(getByText('go'));
    });
    expect(confirmResult).toBe(false);
    expect(promptResult).toBeNull();
  });
});
