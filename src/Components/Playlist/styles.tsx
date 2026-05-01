import { styled } from 'styled-components';
import { FaCirclePlay } from 'react-icons/fa6';

export const PlaylistContainer = styled.div`
  overflow-y: hidden;
  padding: 1rem;
  width: 100%;
`;

export const Header = styled.h2`
  height: fit-content;
  margin-bottom: 1rem;
`;

export const PlaylistInfo = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  margin-top: 3rem;
  padding: 1rem 3rem;
`;

export const PlaylistDetails = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
`;

export const PlayNowButton = styled.button`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 1rem 0.5rem;
  font-size: 1rem;
  gap: 0.5rem;
  max-width: 140px;
  background-color: #9b7ebd;
  color: white;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;

  &:hover {
    background: #e4d4f7;
    color: #5a3a7a;
  }
`;

export const Type = styled.span`
  font-size: 0.85rem;
  text-transform: uppercase;
  color: gray;
`;

export const PlaylistName = styled.h1`
  font-size: 2rem;
  margin: 0;
`;

export const SongsQuantity = styled.span`
  font-size: 0.75rem;
  color: gray;
`;

export const Play = styled(FaCirclePlay)`
  max-width: 30px;
  max-height: 30px;
  cursor: pointer;
  color: #f49bab;
`;

export const SongList = styled.div`
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1rem;
  padding: 2rem 4rem 20rem 4rem;
`;

export const SongItem = styled.div<{ $active?: boolean }>`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  max-height: 4rem;
  gap: 0.5rem;
  cursor: pointer;
  border-radius: 0.75rem;
  padding: 0.75rem 0.5rem;
  background: ${(p) => (p.$active ? '#f49bab33' : 'transparent')};
  transition: background 0.15s;

  &:hover {
    background: ${(p) => (p.$active ? '#f49bab55' : '#f7cdd4')};
  }
`;

export const SongInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
`;

export const SongTitle = styled.span`
  width: fit-content;
  height: fit-content;
`;

export const SongArtist = styled.span`
  width: fit-content;
  color: gray;
  height: fit-content;
`;

export const SongDuration = styled.span`
  margin-left: auto;
  color: gray;
  width: fit-content;
  height: fit-content;
`;
