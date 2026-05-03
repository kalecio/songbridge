import { ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { error as logError } from '../../logger';
import { Container, Detail, Message, ReloadButton, Title } from './styles';

function ErrorFallback({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <Container>
      <Title>Something went wrong</Title>
      <Message>An unexpected error occurred. The details have been saved to the log file.</Message>
      <Detail>{message}</Detail>
      <ReloadButton onClick={() => window.location.reload()}>Reload app</ReloadButton>
    </Container>
  );
}

function ErrorBoundary({ children }: { children: ReactNode }) {
  const handleError = (error: unknown) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    logError(`Unhandled render error: ${message}`).catch(() => {});
  };

  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      {children}
    </ReactErrorBoundary>
  );
}

export default ErrorBoundary;
