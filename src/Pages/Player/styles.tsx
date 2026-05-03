import { styled } from 'styled-components';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { AlbumImage, AlbumImagePlaceholder } from '../../Components/Song/styles';

const PlayerContainer = styled.div`
  background-color: #9b7ebd;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 120px;
`;

const StyledPlayer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 3rem;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
  overflow: hidden;
`;

const Main = styled.div`
  background-color: #ffe1e0;
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
  max-height: calc(100vh - 120px);
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
  border-bottom: 1px solid #e5d8f5;
  background: #faf5ff;
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
  color: #9b7ebd;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid #d4b8f0;
  border-radius: 0.65rem;
  background: #fff;
  font-size: 0.85rem;
  color: #3a1f5a;
  outline: none;
  transition: border-color 0.15s;

  &::placeholder {
    color: #b89fd4;
  }

  &:focus {
    border-color: #9b7ebd;
  }
`;

const SettingsButton = styled.button`
  background: none;
  border: none;
  border-radius: 50%;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #7f55b1;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: #ede5f8;
    color: #3a1f5a;
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
};
