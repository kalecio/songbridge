import { styled } from 'styled-components';

export const LibraryHeading = styled.div`
  padding: 4px 90px 24px 0;
  p {
    font-size: 9px;
    letter-spacing: 2px;
    color: ${({ theme }) => theme.textMuted};
    margin-bottom: 12px;
  }
  h1 {
    font-size: clamp(25px, 2.3vw, 36px);
    font-weight: 650;
    letter-spacing: -1.5px;
    line-height: 1.2;
  }
`;
export const LibraryTabs = styled.nav`
  display: flex;
  align-items: center;
  gap: 24px;
  padding-bottom: 14px;
  margin-bottom: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  button {
    border: 0;
    background: none;
    color: ${({ theme }) => theme.textMuted};
    font: inherit;
    font-size: 10px;
    cursor: pointer;
  }
  button[aria-pressed='true'] {
    color: ${({ theme }) => theme.accent};
  }
  .collection {
    margin-left: auto;
    font-size: 10px;
  }
`;
export const RecentTrack = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 24px;
  padding: 15px 10px;
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
    font-size: 10px;
    flex: 1;
  }
  small {
    display: block;
    color: ${({ theme }) => theme.textMuted};
    font-size: 10px;
    margin-top: 5px;
  }
  time {
    font-size: 11px;
  }
`;
