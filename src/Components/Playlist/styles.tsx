import { styled } from 'styled-components';
import { FaCirclePlay, FaCircleExclamation, FaTrash } from 'react-icons/fa6';

export const PlaylistContainer = styled.div<{ $scroll?: boolean }>`
  overflow-y: ${({ $scroll = true }) => ($scroll ? 'hidden' : 'visible')};
  height: ${({ $scroll = true }) => ($scroll ? '100%' : 'auto')};
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
  background-color: ${({ theme }) => theme.primary};
  color: ${({ theme }) => theme.textOnPrimary};
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.active};
    color: ${({ theme }) => theme.primaryDeep};
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
  color: ${({ theme }) => theme.accent};
`;

export const SongList = styled.div<{ $scroll?: boolean }>`
  overflow-y: ${({ $scroll = true }) => ($scroll ? 'auto' : 'visible')};
  height: ${({ $scroll = true }) => ($scroll ? '100%' : 'auto')};
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1rem;
  padding: ${({ $scroll = true }) => ($scroll ? '2rem 4rem 20rem 4rem' : '0.5rem 4rem')};
`;

export const SongItem = styled.div<{ $active?: boolean; $missing?: boolean }>`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  max-height: 4rem;
  gap: 0.5rem;
  cursor: ${(p) => (p.$missing ? 'default' : 'pointer')};
  border-radius: 0.75rem;
  padding: 0.75rem 0.5rem;
  background: ${(p) => (p.$active ? p.theme.accentBg : 'transparent')};
  opacity: ${(p) => (p.$missing ? 0.45 : 1)};
  transition:
    background 0.15s,
    opacity 0.15s;

  &:hover {
    background: ${(p) => (p.$active ? p.theme.accentBgHover : p.$missing ? 'transparent' : p.theme.accentHover)};
  }
`;

export const SongInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  text-wrap: nowrap;
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

export const MissingIcon = styled(FaCircleExclamation)`
  flex-shrink: 0;
  color: ${({ theme }) => theme.error};
  width: 1rem;
  height: 1rem;
`;

export const RemoveMissingButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.error};
  display: flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;

  ${SongItem}:hover & {
    opacity: 1;
  }
`;

export const RemoveMissingIcon = styled(FaTrash)`
  width: 0.8rem;
  height: 0.8rem;
`;
