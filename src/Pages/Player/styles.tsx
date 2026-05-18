import { styled } from 'styled-components';
import { FaMagnifyingGlass, FaGear } from 'react-icons/fa6';
import { AlbumImage, AlbumImagePlaceholder } from '../../Components/Song/styles';

const PlayerContainer = styled.div`
  background-color: ${({ theme }) => theme.playerBar};
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: column;
  height: 120px;
  position: relative;
  gap: 1rem;
`;

const StyledPlayer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 3rem;
  width: 100%;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
  overflow: hidden;
  height: 100%;
  background-color: ${({ theme }) => theme.background};
`;

const Main = styled.div`
  background-color: ${({ theme }) => theme.background};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow-y: auto;
  flex: 1;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: flex-start;
  flex: 1;
  min-height: 0;
  position: relative;
`;

const MainWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const AppHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  flex-shrink: 0;
  max-height: 3.5rem;
`;

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
`;

const SearchIcon = styled(FaMagnifyingGlass)`
  position: absolute;
  left: 0.65rem;
  width: 0.75rem;
  height: 0.75rem;
  color: ${({ theme }) => theme.primary};
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid ${({ theme }) => theme.borderLight};
  border-radius: 0.65rem;
  background: ${({ theme }) => theme.surfaceRaised};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.textPrimary};
  outline: none;
  transition: border-color 0.15s;

  &::placeholder {
    color: ${({ theme }) => theme.textMuted};
  }

  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const SettingsButton = styled(FaGear)`
  width: 25px;
  height: 25px;
  color: ${({ theme }) => theme.primaryDark};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.textPrimary};
  }
`;

const PlayerAlbumArt = styled(AlbumImage)<{ $height?: string; $width?: string }>`
  cursor: pointer;
  width: ${(props) => props.$width || '25rem'};
  height: ${(props) => props.$height || '25rem'};
`;

const PlayerAlbumArtPlaceholder = styled(AlbumImagePlaceholder)<{ $height?: string; $width?: string }>`
  width: ${(props) => props.$width || '25rem'};
  height: ${(props) => props.$height || '25rem'};
`;

const HomeCenter = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

const ScanBanner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 1rem 0.65rem;
  background: ${({ theme }) => theme.surface};
  border-bottom: 1px solid ${({ theme }) => theme.border};
  flex-shrink: 0;
`;

const ScanBannerLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.textMuted};
`;

export {
  PlayerContainer,
  StyledPlayer,
  Container,
  Main,
  MainWrapper,
  AppHeader,
  SearchWrapper,
  SearchIcon,
  SearchInput,
  ContentContainer,
  PlayerAlbumArt,
  PlayerAlbumArtPlaceholder,
  HomeCenter,
  SettingsButton,
  ScanBanner,
  ScanBannerLabel,
};
