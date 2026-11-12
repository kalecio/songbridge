import { styled } from 'styled-components';
import { selectable } from '../../styles/mixins';
import TextMarquee from '../../Components/TextMarquee/TextMarquee';

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(16px, 1.5vw, 28px);
  @media (max-width: 1050px) {
    gap: 16px;
  }
  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  align-items: start;
`;

export const GridItem = styled.div`
  display: flex;
  flex-direction: column;
  cursor: pointer;
  min-width: 0;
`;

export const Card = styled.div`
  aspect-ratio: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.cardBackground};
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;

  transition:
    transform 0.15s,
    box-shadow 0.15s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 16px ${({ theme }) => theme.cardShadowHover};
  }
`;

export const ArtWrapper = styled.div`
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  & img,
  & svg {
    border-radius: 8px;
  }
  overflow: hidden;
`;

export const CardInfo = styled.div`
  padding: 9px 0 0;
  flex-shrink: 0;
  max-height: 5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
  gap: 0.25rem;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
`;

export const CardTitle = styled(TextMarquee)`
  color: ${({ theme }) => theme.textPrimary};
  font-weight: 500;
  font-size: clamp(0.85rem, 0.9vw, 1rem);
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
  margin-bottom: 0.2rem;
  ${selectable}
`;

export const CardBottom = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

export const CardArtist = styled(TextMarquee)`
  color: ${({ theme }) => theme.textMuted};
  font-size: clamp(0.75rem, 0.8vw, 0.875rem);
  white-space: nowrap;
  overflow: hidden;
  flex: 1;
  min-width: 0;
  ${selectable}
`;

export const CardCount = styled.div`
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.75rem;
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 3rem;
`;
