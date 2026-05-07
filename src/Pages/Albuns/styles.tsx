import { styled } from 'styled-components';

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.25rem;
  align-items: start;
`;

export const GridItem = styled.div`
  display: flex;
  flex-direction: column;
  cursor: pointer;
  max-height: 18rem;
`;

export const Card = styled.div`
  height: 200px;
  width: 200px;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.cardBackground};
  border-radius: 1rem;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 8px ${({ theme }) => theme.cardShadow};
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
  overflow: hidden;
`;

export const CardInfo = styled.div`
  padding: 0.6rem 0.75rem;
  flex-shrink: 0;
  max-height: 5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.25rem;
`;

export const CardTitle = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.2rem;
`;

export const CardBottom = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
`;

export const CardArtist = styled.div`
  color: ${({ theme }) => theme.primary};
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;

export const CardCount = styled.div`
  color: ${({ theme }) => theme.primary};
  font-size: 0.75rem;
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 3rem;
`;
