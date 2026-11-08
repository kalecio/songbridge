import { styled } from 'styled-components';

const LyricsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 2rem 4rem;
  width: 100%;
  min-height: 0;
  flex: 1;
  overflow-y: auto;

  gap: 0.1rem;
`;

interface LyricLineProps {
  $active: boolean;
}

const LyricLine = styled.p<LyricLineProps>`
  font-size: ${({ $active }) => ($active ? '1.145em' : '1em')};
  font-weight: ${({ $active }) => ($active ? '700' : '500')};
  color: ${({ $active, theme }) => ($active ? theme.accent : theme.textSecondary)};
  text-align: center;
  max-width: 100%;
  overflow-wrap: anywhere;
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
  font-size: 1em;
  font-weight: 500;
  color: ${({ theme }) => theme.textSecondary};
  text-align: center;
  max-width: 100%;
  overflow-wrap: anywhere;
  margin: 0;
  padding: 0.4rem 1rem;
  line-height: 1.45;
  cursor: default;
`;

const LyricsPage = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
`;
const EmptyLyricsState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: auto;
  text-align: center;
  font-size: 14px;
  p {
    color: ${({ theme }) => theme.textSecondary};
  }
`;
const FindLyricsButton = styled.button`
  padding: 12px 20px;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => theme.textOnPrimary};
  &:hover {
    background: ${({ theme }) => theme.primaryDark};
  }
`;

export { EmptyLyricsState, FindLyricsButton, LyricsPage, LyricsContainer, LyricLine, PlainLyricLine };
