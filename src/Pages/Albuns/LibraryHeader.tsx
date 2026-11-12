import { styled } from 'styled-components';

export const LibraryHeading = styled.div`
  padding: 4px 90px 28px 0;
  p {
    font-size: 0.75rem;
    letter-spacing: 0.18em;
    color: ${({ theme }) => theme.textMuted};
    margin-bottom: 12px;
  }
  h1 {
    font-size: clamp(2rem, 2.5vw, 2.75rem);
    font-weight: 650;
    letter-spacing: -1.5px;
    line-height: 1.2;
  }
`;
export const RecentTrack = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 28px;
  padding: 20px 10px;
  border-top: 1px solid ${({ theme }) => theme.border};
  .equalizer {
    color: ${({ theme }) => theme.accent};
    letter-spacing: 2px;
  }
  .track-title {
    background: none;
    border: 0;
    text-align: left;
    color: ${({ theme }) => theme.textPrimary};
    cursor: pointer;
    font: inherit;
    font-size: 0.95rem;
    flex: 1;
  }
  small {
    display: block;
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.85rem;
    margin-top: 5px;
  }
  time {
    font-size: 0.85rem;
  }
`;
