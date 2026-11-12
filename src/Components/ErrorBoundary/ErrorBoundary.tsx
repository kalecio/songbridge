import { ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { error as logError } from '../../logger';
import { useI18n } from '../../i18n/I18nProvider';
import { Container, Detail, Message, ReloadButton, Title } from './styles';

function ErrorFallback({ error }: { error: unknown }) {
  const { t } = useI18n();
  const message = error instanceof Error ? error.message : String(error);

  return (
    <Container>
      <Title>{t('error.somethingWentWrong')}</Title>
      <Message>{t('error.unexpected')}</Message>
      <Detail>{message}</Detail>
      <ReloadButton onClick={() => window.location.reload()}>{t('error.reload')}</ReloadButton>
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
