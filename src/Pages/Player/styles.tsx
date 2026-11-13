import { styled } from 'styled-components';
import { FaMagnifyingGlass, FaGear } from 'react-icons/fa6';
import { AlbumImage, AlbumImagePlaceholder } from '../../Components/Song/styles';

const PlayerContainer = styled.div`
  background-color: ${({ theme }) => theme.playerBar};
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: column;
  min-height: 76px;
  flex-shrink: 0;
  border-top: 1px solid ${({ theme }) => theme.border};
  justify-content: center;
  position: relative;
  gap: 1rem;
`;

const StyledPlayer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 24px;
  padding: 14px clamp(20px, 2.6vw, 48px);
  box-sizing: border-box;
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
  position: relative;
`;

const NowPlaying = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 28%;
  min-width: 180px;
`;
const AppHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex: 0 0 64px;
  min-height: 64px;
  padding: 0 clamp(24px, 2.6vw, 48px);
  background: ${({ theme }) => theme.background};
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;
const FocusHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 48px;
  min-height: 48px;
  padding: 0 clamp(18px, 2vw, 32px);
  background: ${({ theme }) => theme.background};
`;
const FocusModeButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 9px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.textSecondary};
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  &:hover, &:focus-visible {
    border-color: ${({ theme }) => theme.accent};
    color: ${({ theme }) => theme.accent};
    outline: none;
  }
`;
const HistoryControls = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;
const HistoryButton = styled.button`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: ${({ theme }) => theme.textSecondary};
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;

  svg {
    width: 13px;
    height: 13px;
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.hover};
    color: ${({ theme }) => theme.accent};
  }

  &:disabled {
    color: ${({ theme }) => theme.textMuted};
    cursor: default;
    opacity: 0.45;
  }
`;
const SearchWrapper = styled.div<{ $expanded?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  width: ${({ $expanded }) => ($expanded ? '250px' : '26px')};
  min-width: 26px;
  max-width: min(300px, calc(100% - 136px));
  flex-shrink: 1;
  &:focus-within {
    width: min(300px, 45vw);
  }
`;
const SearchIcon = styled(FaMagnifyingGlass)`
  position: absolute;
  right: 5px;
  width: 17px;
  height: 17px;
  color: ${({ theme }) => theme.textSecondary};
  pointer-events: none;
`;
const SearchInput = styled.input`
  width: 100%;
  min-width: 0;
  height: 32px;
  padding: 6px 28px 6px 10px;
  background: ${({ theme }) => theme.background};
  border: 1px solid transparent;
  color: ${({ theme }) => theme.textPrimary};
  font: inherit;
  font-size: 12px;
  border-radius: 5px;
  &::placeholder {
    color: ${({ theme }) => theme.textMuted};
  }
  &:focus {
    border-color: ${({ theme }) => theme.accent};
    outline: none;
  }
`;
const SettingsButton = styled.button.attrs({ type: 'button', children: <FaGear /> })`
  padding: 0;
  border: 0;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  position: relative;
  z-index: 1;
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;
  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  &:hover {
    color: ${({ theme }) => theme.accent};
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

const ControlsWrapper = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 220px;
`;

export {
  NowPlaying,
  PlayerContainer,
  StyledPlayer,
  Container,
  Main,
  MainWrapper,
  AppHeader,
  FocusHeader,
  FocusModeButton,
  SearchWrapper,
  HistoryControls,
  HistoryButton,
  SearchIcon,
  SearchInput,
  ContentContainer,
  PlayerAlbumArt,
  PlayerAlbumArtPlaceholder,
  HomeCenter,
  SettingsButton,
  ScanBanner,
  ScanBannerLabel,
  ControlsWrapper,
};
