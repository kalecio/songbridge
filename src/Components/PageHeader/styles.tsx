import { styled } from 'styled-components';

export const PageHeader = styled.h2`
  color: ${({ theme }) => theme.textPrimary};
  margin: 0 0 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: clamp(1.5rem, 2.3vw, 2.25rem);
  font-weight: 650;
  letter-spacing: -0.06em;
  padding: 0 0 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;
