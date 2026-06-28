import { styled } from 'styled-components';

const ModalContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 600px;
  max-width: 900px;
  max-height: 85vh;
`;

const SearchSection = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.375rem;
  background: ${({ theme }) => theme.background};
  color: ${({ theme }) => theme.textPrimary};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.accent};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.accent}40;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SearchButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => theme.textOnPrimary};
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s,
    filter 0.15s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.primaryDark};
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  max-height: 60vh;
  padding-right: 0.5rem;
`;

const ResultItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.5rem;
`;

const ResultInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const ResultMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.textSecondary};
`;

const ResultActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const DownloadButton = styled.button<{ variant: 'primary' | 'secondary' | 'disabled' }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 0.375rem;
  cursor: ${({ variant }) => (variant === 'disabled' ? 'not-allowed' : 'pointer')};
  opacity: ${({ variant }) => (variant === 'disabled' ? 0.5 : 1)};
  transition: all 0.15s ease;

  ${({ variant, theme }) => {
    switch (variant) {
      case 'primary':
        return `
          background: ${theme.accent};
          color: ${theme.textOnPrimary};
          &:hover:not(:disabled) {
            filter: brightness(1.1);
          }
        `;
      case 'secondary':
        return `
          background: ${theme.surface};
          color: ${theme.textPrimary};
          border: 1px solid ${theme.border};
          &:hover:not(:disabled) {
            background: ${theme.background};
          }
        `;
      case 'disabled':
        return `
          background: ${theme.surface};
          color: ${theme.textSecondary};
          border: 1px dashed ${theme.border};
        `;
    }
  }}

  &:disabled {
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 1rem;
`;

const NoResults = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 1rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.error}15;
  border: 1px solid ${({ theme }) => theme.error};
  border-radius: 0.375rem;
  color: ${({ theme }) => theme.error};
  font-size: 0.875rem;
`;

const TrackTypeBadge = styled.span<{ synced?: boolean; plain?: boolean; instrumental?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;

  ${({ synced, plain, instrumental, theme }) => {
    if (instrumental) {
      return `
        background: ${theme.warning}20;
        color: ${theme.warning};
        border: 1px solid ${theme.warning}40;
      `;
    }
    if (synced && plain) {
      return `
        background: ${theme.accent}20;
        color: ${theme.accent};
        border: 1px solid ${theme.accent}40;
      `;
    }
    if (synced) {
      return `
        background: ${theme.success}20;
        color: ${theme.success};
        border: 1px solid ${theme.success}40;
      `;
    }
    if (plain) {
      return `
        background: ${theme.accentBg};
        color: ${theme.accent};
        border: 1px solid ${theme.accent}40;
      `;
    }
    return `
      background: ${theme.surface};
      color: ${theme.textSecondary};
      border: 1px solid ${theme.border};
    `;
  }}
`;

export {
  ModalContainer,
  SearchSection,
  SearchInput,
  SearchButton,
  ResultsList,
  ResultItem,
  ResultInfo,
  ResultMeta,
  ResultActions,
  DownloadButton,
  LoadingSpinner,
  NoResults,
  ErrorMessage,
  TrackTypeBadge,
};
