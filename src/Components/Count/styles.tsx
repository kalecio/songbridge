import { styled } from 'styled-components';

export const Count = styled.span`
  font-size: 0.9rem;
  font-weight: normal;
  color: ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.surfaceRaised};
  border-radius: 1rem;
  padding: 1rem 0.6rem;
  max-width: 3rem;
  max-height: 2rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
`;
