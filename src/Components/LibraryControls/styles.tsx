import { styled } from 'styled-components';

export const Controls = styled.div`
  display: flex;
  gap: 0.75rem;
  margin: 0 0 1.25rem;

  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const field = `
  min-height: 2.75rem;
  padding: 0.6rem 0.8rem;
  border-radius: 0.6rem;
  font: inherit;
`;

export const Search = styled.input`
  ${field}
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surfaceRaised};
  color: ${({ theme }) => theme.textPrimary};
  flex: 1;
  min-width: 0;
`;

export const SortSelect = styled.select`
  ${field}
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surfaceRaised};
  color: ${({ theme }) => theme.textPrimary};
  min-width: 11rem;
`;
