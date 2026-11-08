import { styled } from 'styled-components';

export const PageHeader = styled.h2`
  color: ${({ theme }) => theme.textPrimary};
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 30px;
  letter-spacing: -1px;
  padding: 0 0 28px;
`;
