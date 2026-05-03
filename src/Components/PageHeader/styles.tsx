import { styled } from 'styled-components';

export const PageHeader = styled.h2`
  color: ${({ theme }) => theme.primaryDeep};
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-height: 2.5rem;
  padding: 3rem 0rem;
`;
