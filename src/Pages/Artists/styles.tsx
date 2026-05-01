import { styled } from 'styled-components';

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
    background: #f0e8fa;
  }
`;

export const Avatar = styled.div`
  width: 100px;
  height: 100px;
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #9b7ebd, #f49bab);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
`;

export const ArtistName = styled.div`
  color: #3a1f5a;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

export const ArtistMeta = styled.div`
  color: #9b7ebd;
  font-size: 0.75rem;
  text-align: center;
`;
