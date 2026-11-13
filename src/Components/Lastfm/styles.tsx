import { styled } from 'styled-components';

export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
  color: ${({ theme }) => theme.textPrimary};
  p {
    margin: 0;
    color: ${({ theme }) => theme.textSecondary};
    line-height: 1.5;
  }
  a {
    color: ${({ theme }) => theme.primary};
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  input[type='checkbox'] {
    accent-color: ${({ theme }) => theme.primary};
  }
`;
export const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;
export const History = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 16rem;
  overflow: auto;
  li {
    padding: 0.65rem 0;
    border-bottom: 1px solid ${({ theme }) => theme.border};
  }
  small {
    display: block;
    color: ${({ theme }) => theme.textMuted};
    margin-top: 0.25rem;
  }
`;
export const StatusButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 1rem;
  padding: 0.35rem 0.6rem;
  color: ${({ theme }) => theme.textPrimary};
  background: ${({ theme }) => theme.surface};
  font-size: 0.7rem;
  cursor: pointer;
  flex-shrink: 0;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }
`;
export const ImportPanel = styled(Panel)`
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.65rem;
  padding: 0.75rem;
  max-height: 55vh;
  overflow-y: auto;
  img {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: 0.5rem;
  }
  fieldset {
    border: 0;
    padding: 0;
    display: grid;
    gap: 0.65rem;
    min-width: 0;
  }
  legend {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  label {
    align-items: flex-start;
  }
  label span {
    overflow-wrap: anywhere;
  }
`;
