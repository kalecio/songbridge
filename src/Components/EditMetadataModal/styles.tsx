import { styled } from 'styled-components';

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

export const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const ErrorText = styled.p`
  margin: 0;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.error};
`;

export const CoverArtSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 0.25rem;
`;

export const CoverArtPreview = styled.div<{ $hasImage: boolean }>`
  flex-shrink: 0;
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surfaceAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 1.5rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

export const CoverArtActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
`;

export const CoverArtButton = styled.button`
  appearance: none;
  border: 1px solid ${({ theme }) => theme.border};
  background: transparent;
  color: ${({ theme }) => theme.textPrimary};
  padding: 0.4rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 500;
  border-radius: 0.4rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.hover};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 2px;
  }
`;

export const RemoveCoverButton = styled(CoverArtButton)`
  color: ${({ theme }) => theme.error};
  border-color: transparent;
  font-size: 0.78rem;
`;

export const FilenameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

export const Extension = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.textSecondary};
  white-space: nowrap;
  flex-shrink: 0;
  padding: 0.55rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.5rem;
  background: ${({ theme }) => theme.surfaceAlt};
  line-height: 1;
`;

export const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.textSecondary};
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    width: 1rem;
    height: 1rem;
    cursor: pointer;
    accent-color: ${({ theme }) => theme.primary};
    flex-shrink: 0;
  }
`;
