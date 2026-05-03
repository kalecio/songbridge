import { render, screen } from '@testing-library/react';
import { error as mockLogError } from '../../logger';
import ErrorBoundary from './ErrorBoundary';

vi.mock('../../logger', () => ({
  error: vi.fn(() => Promise.resolve()),
}));

const Bomb = () => {
  throw new Error('Test render error');
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/details have been saved to the log file/i)).toBeInTheDocument();
    expect(screen.getByText('Test render error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload app/i })).toBeInTheDocument();
  });

  it('logs the error to the log file when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(mockLogError).toHaveBeenCalledWith(expect.stringContaining('Test render error'));
  });
});
