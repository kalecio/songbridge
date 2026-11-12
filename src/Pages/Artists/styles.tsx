import { styled } from 'styled-components';
import { selectable } from '../../styles/mixins';

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(16px, 1.5vw, 24px);
  @media (max-width: 1050px) {
    gap: 16px;
  }
  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0;
  min-width: 0;
  transition: transform 0.15s;

  &:hover {
    transform: translateY(-2px);
  }
`;

export const Avatar = styled.div`
  width: 100%;
  max-width: 180px;
  height: auto;
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, ${({ theme }) => theme.primary}, ${({ theme }) => theme.accent});
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
`;

export const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

export const ArtistName = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-weight: 600;
  font-size: 0.9rem;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  ${selectable}
`;

export const ArtistMeta = styled.div`
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.75rem;
  text-align: left;
`;
