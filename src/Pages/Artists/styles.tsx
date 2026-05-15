import { styled } from 'styled-components';
import { selectable } from '../../styles/mixins';

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 1.5rem;
`;

export const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 1rem;
  max-height: 180px;
  transition: background 0.15s;

  &:hover {
    background: ${({ theme }) => theme.surfaceRaised};
  }
`;

export const Avatar = styled.div`
  width: 100px;
  height: 100px;
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, ${({ theme }) => theme.primary}, ${({ theme }) => theme.accent});
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
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
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  ${selectable}
`;

export const ArtistMeta = styled.div`
  color: ${({ theme }) => theme.primary};
  font-size: 0.75rem;
  text-align: center;
`;
