import { FaAngleLeft, FaCompactDisc, FaHeart, FaHouse, FaMicrophoneLines, FaMusic, FaPlus } from 'react-icons/fa6';
import { styled } from 'styled-components';

const SidebarContainer = styled.div`
  background-color: ${({ theme }) => theme.surfaceAlt};
  width: 30%;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  overflow-y: auto;
  border-right: 1px solid ${({ theme }) => theme.border};
  gap: 0.1rem;
`;

const AppLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0.5rem 1.5rem;
  flex-shrink: 0;
`;

const AppName = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.textPrimary};
`;

const SectionLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.primary};
  padding: 0.75rem 0.5rem 0.25rem;
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
  color: ${({ theme }) => theme.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.primaryDark};
  }
`;

const Menu = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.15rem;
  flex-shrink: 0;
`;

const MenuItem = styled.div<{
  $active?: boolean;
  $dragging?: boolean;
  $dropAbove?: boolean;
  $dropBelow?: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${(p) => (p.$active ? p.theme.primaryDark : p.theme.textPrimary)};
  cursor: pointer;
  padding: 0.6rem 0.75rem;
  border-radius: 0.65rem;
  font-size: 0.9rem;
  font-weight: ${(p) => (p.$active ? '600' : '400')};
  background: ${(p) => (p.$active ? p.theme.hoverActive : 'transparent')};
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
    color: ${({ theme }) => theme.primaryDark};
  }
`;

const PlaylistItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${(p) => (p.$active ? p.theme.primaryDark : p.theme.textPrimary)};
  cursor: pointer;
  padding: 0.4rem 0.5rem;
  border-radius: 0.65rem;
  font-size: 0.875rem;
  font-weight: ${(p) => (p.$active ? '600' : '400')};
  background: ${(p) => (p.$active ? p.theme.hoverActive : 'transparent')};
  transition:
    background 0.15s,
    color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;

  &:hover {
    background: ${(p) => (p.$active ? p.theme.hoverActive : p.theme.hover)};
    color: ${({ theme }) => theme.primaryDark};
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
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.5rem 0.75rem 1rem;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.primaryDark};
  }
`;

const LogoImg = styled.img`
  width: 70px;
  height: 70px;
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
  AppLogo,
  AppName,
  LogoImg,
  SectionLabel,
  PlaylistsRow,
  PlusButton,
  Menu,
  MenuItem,
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
