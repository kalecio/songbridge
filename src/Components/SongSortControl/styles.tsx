import { styled } from 'styled-components';

export const SortGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  min-height: 2rem;
  padding: 0.15rem 0.25rem 0.15rem 0.55rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.textMuted};
  transition:
    border-color 0.15s,
    background 0.15s;

  &:hover,
  &:focus-within {
    border-color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.surfaceRaised};
  }
`;

export const SortSelect = styled.select<{ $compact?: boolean }>`
  max-width: ${({ $compact }) => ($compact ? '6rem' : '9rem')};
  padding: 0.2rem 0.3rem;
  border: 0;
  outline: 0;
  background: transparent;
  color: ${({ theme }) => theme.textPrimary};
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;

  option {
    background: ${({ theme }) => theme.surfaceRaised};
    color: ${({ theme }) => theme.textPrimary};
  }
`;

export const SortFieldLabel = styled.span`
  padding: 0.2rem 0.3rem;
  color: ${({ theme }) => theme.textPrimary};
  font-size: 0.75rem;
  white-space: nowrap;
`;

export const DirectionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;

  svg {
    width: 0.85rem;
    height: 0.85rem;
  }

  &:hover {
    background: ${({ theme }) => theme.hover};
    color: ${({ theme }) => theme.accent};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 2px;
  }
`;
