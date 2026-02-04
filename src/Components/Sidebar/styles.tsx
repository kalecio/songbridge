import { FaAngleLeft, FaCompactDisc, FaHouse, FaMicrophoneLines, FaMusic, FaPlus } from 'react-icons/fa6';
import { styled } from 'styled-components';

const SidebarContainer = styled.div`
  background-color: #f7f4fc;
  width: 30%;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  overflow-y: auto;
  border-right: 1px solid #e5d8f5;
  gap: 0.1rem;
`;

const AppLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0.5rem 1.5rem;
  max-height: 8rem;
`;

const AppName = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: #3a1f5a;
`;

const SectionLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9b7ebd;
  padding: 0.75rem 0.5rem 0.25rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  max-height: 1.5rem;
`;

const PlaylistsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 0.25rem;
  max-height: 1.5rem;
`;

const PlusButtonContainer = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #9b7ebd;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.25rem;
  border-radius: 0.4rem;
  transition:
    color 0.15s,
    background 0.15s;
  max-width: 2rem;
  max-height: 2rem;

  &:hover {
    color: #7f55b1;
    background: #e8d8f5;
  }
`;

const Menu = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.15rem;
`;

const MenuItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${(p) => (p.$active ? '#7f55b1' : '#3a1f5a')};
  cursor: pointer;
  padding: 0.6rem 0.75rem;
  border-radius: 0.65rem;
  font-size: 0.9rem;
  font-weight: ${(p) => (p.$active ? '600' : '400')};
  background: ${(p) => (p.$active ? '#e8d8f5' : 'transparent')};
  transition:
    background 0.15s,
    color 0.15s;
  max-height: 3rem;

  &:hover {
    background: ${(p) => (p.$active ? '#e8d8f5' : '#ede5f8')};
    color: #7f55b1;
  }
`;

const PlaylistItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${(p) => (p.$active ? '#7f55b1' : '#3a1f5a')};
  cursor: pointer;
  padding: 0.4rem 0.5rem;
  border-radius: 0.65rem;
  font-size: 0.875rem;
  font-weight: ${(p) => (p.$active ? '600' : '400')};
  background: ${(p) => (p.$active ? '#e8d8f5' : 'transparent')};
  transition:
    background 0.15s,
    color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 3rem;

  &:hover {
    background: ${(p) => (p.$active ? '#e8d8f5' : '#ede5f8')};
    color: #7f55b1;
  }
`;

const PlaylistThumb = styled.div`
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  overflow: hidden;
  flex-shrink: 0;
`;

const QueueHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #3a1f5a;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.5rem 0.75rem 1rem;
  max-height: 2.5rem;

  &:hover {
    color: #7f55b1;
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

const PlusIcon = styled(FaPlus)`
  max-width: 11px;
  max-height: 11px;
`;

export {
  SidebarContainer,
  AppLogo,
  AppName,
  LogoImg,
  SectionLabel,
  PlaylistsRow,
  PlusButtonContainer,
  PlusIcon,
  Menu,
  MenuItem,
  PlaylistItem,
  PlaylistThumb,
  QueueHeader,
  HomeIcon,
  ArtistsIcon,
  AlbumsIcon,
  SongsIcon,
  BackIcon,
};
