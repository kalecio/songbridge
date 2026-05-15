import { styled } from 'styled-components';
import { FaHeart } from 'react-icons/fa6';
import { selectable } from '../../styles/mixins';

export const SearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 2rem 2.5rem;
  gap: 2rem;
  overflow-y: auto;
`;

export const ResultsSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-shrink: 3;
`;

export const SectionTitle = styled.h2`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.primary};
  margin: 0 0 0.5rem;
`;

export const SongRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.65rem;
  cursor: pointer;
  transition: background 0.15s;
  min-width: 0;

  &:hover {
    background: ${({ theme }) => theme.hover};
  }
`;

export const SongInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

export const SongTitle = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.textPrimary};
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
`;

export const SongArtist = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.primary};
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
`;

export const ArtistContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  flex-wrap: wrap;
`;

export const ArtistRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.65rem;
  cursor: pointer;
  transition: background 0.15s;
  max-width: 8rem;

  &:hover {
    background: ${({ theme }) => theme.hover};
  }
`;

export const ArtistAvatar = styled.div`
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: ${({ theme }) => theme.borderLight};
  color: ${({ theme }) => theme.textPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
`;

export const ArtistImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

export const ArtistName = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.textPrimary};
  text-align: center;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
`;

export const AlbumRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.65rem;
  cursor: pointer;
  transition: background 0.15s;
  min-width: 0;

  &:hover {
    background: ${({ theme }) => theme.hover};
  }
`;

export const AlbumArt = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.4rem;
  overflow: hidden;
  flex-shrink: 0;
`;

export const AlbumInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

export const AlbumTitle = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.textPrimary};
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
`;

export const AlbumArtist = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.primary};
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
`;

export const NoResults = styled.p`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.textMuted};
  margin: 0;
  ${selectable}
`;

export const FavouriteThumb = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.hoverActive};
  color: ${({ theme }) => theme.accent};
  flex-shrink: 0;
`;

export const FavouriteHeart = styled(FaHeart)`
  width: 1.1rem;
  height: 1.1rem;
`;
