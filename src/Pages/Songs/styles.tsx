import { styled } from 'styled-components';

export const SortControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: -0.5rem 0 1rem;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.85rem;
`;

export const SortSelect = styled.select`
  min-height: 2.5rem;
  min-width: 10rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.5rem;
  background: ${({ theme }) => theme.surfaceRaised};
  color: ${({ theme }) => theme.textPrimary};
  font: inherit;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 2px;
  }
`;

export const SortDirectionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.5rem;
  background: ${({ theme }) => theme.surfaceRaised};
  color: ${({ theme }) => theme.textPrimary};
  font-size: 1.2rem;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 2px;
  }
`;
