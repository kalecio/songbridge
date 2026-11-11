import { styled } from 'styled-components';

const LyricsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 4rem) 5rem;
  overflow-y: auto;
  height: 100%;
  gap: 0.2rem;
  color: ${({ theme }) => theme.textPrimary};
`;

interface LyricLineProps {
  $active: boolean;
}

const LyricLine = styled.p<LyricLineProps>`
  font-size: ${({ $active }) => ($active ? 'clamp(2rem, 4vw, 2.75rem)' : 'clamp(1.5rem, 3.5vw, 2.4rem)')};
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  color: ${({ $active, theme }) => ($active ? theme.accent : theme.textSecondary)};
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

const PlainLyricLine = styled.p`
  font-size: clamp(1.5rem, 3.5vw, 2.4rem);
  font-weight: 500;
  color: ${({ theme }) => theme.textSecondary};
  text-align: center;
  margin: 0;
  padding: 0.4rem 1rem;
  line-height: 1.45;
  cursor: default;
`;

export { LyricsContainer, LyricLine, PlainLyricLine };
