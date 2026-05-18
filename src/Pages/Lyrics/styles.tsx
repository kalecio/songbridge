import { styled } from 'styled-components';

const LyricsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 2rem 4rem;
  overflow-y: auto;
  height: 100%;
  gap: 0.1rem;
`;

interface LyricLineProps {
  $active: boolean;
}

const LyricLine = styled.p<LyricLineProps>`
  font-size: ${({ $active }) => ($active ? '2.75rem' : '2.4rem')};
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  color: ${({ $active, theme }) => ($active ? theme.primary : theme.textSecondary)};
  text-align: center;
  margin: 0;
  padding: 0.4rem 1rem;
  cursor: pointer;
  line-height: 1.45;
  border-radius: 0.375rem;

  &:hover {
    text-decoration: underline;
    color: ${({ theme }) => theme.textPrimary};
  }
`;

export { LyricsContainer, LyricLine };
