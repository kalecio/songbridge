import { styled } from 'styled-components';
import { FaCirclePlay, FaCircleExclamation, FaTrash } from 'react-icons/fa6';
import { selectable } from '../../styles/mixins';

export const PlaylistContainer = styled.div<{ $scroll?: boolean }>`
  overflow: ${({ $scroll = true }) => ($scroll ? 'hidden' : 'visible')};
  height: ${({ $scroll = true }) => ($scroll ? '100%' : 'auto')};
  padding: 28px clamp(24px, 2.6vw, 48px) 24px;
  width: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const Header = styled.h2`
  height: fit-content;
  margin: 0 0 1.25rem;
  flex: 0 0 auto;
`;

export const PlaylistInfo = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.5rem;
  margin: 0;
  padding: 0 0 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
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
  padding: 0.75rem 1rem;
  font-size: 1rem;
  gap: 0.5rem;
  max-width: 140px;
  background-color: ${({ theme }) => theme.primary};
  color: ${({ theme }) => theme.textOnPrimary};
  border: none;
  border-radius: 0.4rem;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.active};
    color: ${({ theme }) => theme.primaryDeep};
  }
`;

export const Type = styled.span`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.textMuted};
`;

export const PlaylistName = styled.h1`
  font-size: clamp(1.75rem, 2.5vw, 2.5rem);
  letter-spacing: -0.05em;
  font-weight: 650;
  margin: 0;
  ${selectable}
`;

export const SongsQuantity = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.textMuted};
`;

export const Play = styled(FaCirclePlay)`
  max-width: 30px;
  max-height: 30px;
  cursor: pointer;
  color: inherit;
`;

export const SongList = styled.div<{ $scroll?: boolean }>`
  overflow-y: ${({ $scroll = true }) => ($scroll ? 'auto' : 'visible')};
  height: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.15rem;
  padding: ${({ $scroll = true }) => ($scroll ? '0.75rem 0 5rem' : '0.75rem 0')};
  min-height: 0;
  flex: ${({ $scroll = true }) => ($scroll ? '1 1 auto' : '0 0 auto')};
`;

export const SongItem = styled.div<{
  $active?: boolean;
  $missing?: boolean;
  $dragging?: boolean;
  $dropAbove?: boolean;
  $dropBelow?: boolean;
}>`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  min-height: 4rem;
  gap: 0.75rem;
  cursor: ${(p) => (p.$missing ? 'default' : 'pointer')};
  border-radius: 0.35rem;
  padding: 0.5rem 0.65rem;
  background: ${(p) => (p.$active ? p.theme.accentBg : 'transparent')};
  opacity: ${(p) => (p.$dragging ? 0.4 : p.$missing ? 0.45 : 1)};
  transition:
    background 0.15s,
    opacity 0.15s,
    box-shadow 0.1s;
  ${(p) => p.$dropAbove && `box-shadow: inset 0 2px 0 0 ${p.theme.accent};`}
  ${(p) => p.$dropBelow && `box-shadow: inset 0 -2px 0 0 ${p.theme.accent};`}

  &:hover {
    background: ${(p) => (p.$active ? p.theme.accentBgHover : p.$missing ? 'transparent' : p.theme.accentHover)};
  }
`;

export const SongInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

export const SongTitle = styled.span`
  font-size: 0.9rem;
  font-weight: 550;
  color: ${({ theme }) => theme.textPrimary};
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
`;

export const SongArtist = styled.span`
  font-size: 0.8rem;
  max-width: 100%;
  color: ${({ theme }) => theme.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
`;

export const SongDuration = styled.span`
  margin-left: auto;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.textMuted};
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
