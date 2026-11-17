import { FaAngleLeft, FaCompactDisc, FaHeart, FaHouse, FaMicrophoneLines, FaMusic, FaPlus } from 'react-icons/fa6';
import { styled } from 'styled-components';

const SidebarContainer = styled.aside<{ $width: number; $resizing: boolean }>`
  background-color: ${({ theme }) => theme.background};
  width: ${({ $width }) => $width}px;
  flex-shrink: 0;
  min-width: 175px;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
  border-right: 1px solid ${({ theme }) => theme.border};
  gap: 0.1rem;
  ${({ $resizing }) => $resizing && 'cursor: col-resize; & * { cursor: col-resize !important; }'}
`;
const SidebarContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 24px 16px;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  .sidebar-item-label {
    min-width: 0;
  }
  button > svg {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
  }
`;
const ResizeHandle = styled.div`
  position: absolute;
  right: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  z-index: 10;
  cursor: col-resize;
  touch-action: none;
  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.accentBg};
    outline: none;
  }
  &:hover::after,
  &:focus-visible::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: ${({ theme }) => theme.accent};
  }
`;

const AppLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0 14px;
  flex-shrink: 0;
`;

const AppName = styled.span`
  font-size: 16px;
  letter-spacing: -0.6px;
  font-weight: 700;
  color: ${({ theme }) => theme.textPrimary};
`;

const SectionLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: ${({ theme }) => theme.textMuted};
  padding: 18px 0 12px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-shrink: 0;
`;

const PlaylistsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 0.25rem;
  flex-shrink: 0;
`;

const PlusButton = styled(FaPlus)`
  width: 14px;
  height: 14px;
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.accent};
  }
`;

const Menu = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.15rem;
  flex-shrink: 0;
`;

const MenuItem = styled.button<{
  $active?: boolean;
  $dragging?: boolean;
  $dropAbove?: boolean;
  $dropBelow?: boolean;
}>`
  border: 0;
  font-family: inherit;
  text-align: left;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${(p) => (p.$active ? p.theme.accent : p.theme.textSecondary)};
  cursor: pointer;
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '400')};
  background: ${(p) => (p.$active ? p.theme.active : 'transparent')};
  opacity: ${(p) => (p.$dragging ? 0.4 : 1)};
  transition:
    background 0.15s,
    color 0.15s,
    opacity 0.15s,
    box-shadow 0.1s;
  flex-shrink: 0;
  ${(p) => p.$dropAbove && `box-shadow: inset 0 2px 0 0 ${p.theme.accent};`}
  ${(p) => p.$dropBelow && `box-shadow: inset 0 -2px 0 0 ${p.theme.accent};`}

  &:hover {
    background: ${(p) => (p.$active ? p.theme.hoverActive : p.theme.hover)};
    color: ${({ theme }) => theme.accent};
  }
`;

const QueueRow = styled.div<{
  $active?: boolean;
  $dragging?: boolean;
  $dropAbove?: boolean;
  $dropBelow?: boolean;
}>`
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
  gap: 0.15rem;
  border-radius: 4px;
  color: ${(p) => (p.$active ? p.theme.accent : p.theme.textSecondary)};
  background: ${(p) => (p.$active ? p.theme.active : 'transparent')};
  opacity: ${(p) => (p.$dragging ? 0.4 : 1)};
  transition:
    background 0.15s,
    color 0.15s,
    opacity 0.15s,
    box-shadow 0.1s;
  ${(p) => p.$dropAbove && `box-shadow: inset 0 2px 0 0 ${p.theme.accent};`}
  ${(p) => p.$dropBelow && `box-shadow: inset 0 -2px 0 0 ${p.theme.accent};`}

  &:hover {
    background: ${(p) => (p.$active ? p.theme.hoverActive : p.theme.hover)};
    color: ${({ theme }) => theme.accent};
  }
`;

const QueuePlayButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 10px;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: -2px;
  }
`;

const QueueRemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 2rem;
  height: 2rem;
  margin-right: 0.35rem;
  padding: 0;
  border: 0;
  border-radius: 0.35rem;
  color: ${({ theme }) => theme.textMuted};
  background: transparent;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.error};
    background: ${({ theme }) => theme.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.error};
    outline-offset: 1px;
  }
`;

const PlaylistItem = styled.button<{ $active?: boolean }>`
  border: 0;
  font-family: inherit;
  text-align: left;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${(p) => (p.$active ? p.theme.accent : p.theme.textSecondary)};
  cursor: pointer;
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '400')};
  background: ${(p) => (p.$active ? p.theme.active : 'transparent')};
  transition:
    background 0.15s,
    color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;

  &:hover {
    background: ${(p) => (p.$active ? p.theme.hoverActive : p.theme.hover)};
    color: ${({ theme }) => theme.accent};
  }
`;

const PlaylistThumb = styled.div`
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  overflow: hidden;
  flex-shrink: 0;
`;

const FavouriteThumb = styled.div`
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.hoverActive};
  color: ${({ theme }) => theme.accent};
  flex-shrink: 0;
`;

const HeartIcon = styled(FaHeart)`
  width: 1rem;
  height: 1rem;
`;

const QueueHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.textPrimary};
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  padding: 0.5rem 0.75rem 1rem;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.accent};
  }
`;

const LogoImg = styled.img`
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
`;

const HomeIcon = styled(FaHouse)`
  max-width: 16px;
  max-height: 16px;
`;

const ArtistsIcon = styled(FaMicrophoneLines)`
  max-width: 16px;
  max-height: 16px;
`;

const AlbumsIcon = styled(FaCompactDisc)`
  max-width: 16px;
  max-height: 16px;
`;

const SongsIcon = styled(FaMusic)`
  max-width: 16px;
  max-height: 16px;
`;

const BackIcon = styled(FaAngleLeft)`
  max-width: 16px;
  max-height: 16px;
`;

export {
  SidebarContainer,
  SidebarContent,
  ResizeHandle,
  AppLogo,
  AppName,
  LogoImg,
  SectionLabel,
  PlaylistsRow,
  PlusButton,
  Menu,
  MenuItem,
  QueueRow,
  QueuePlayButton,
  QueueRemoveButton,
  PlaylistItem,
  PlaylistThumb,
  FavouriteThumb,
  HeartIcon,
  QueueHeader,
  HomeIcon,
  ArtistsIcon,
  AlbumsIcon,
  SongsIcon,
  BackIcon,
};
