import { styled } from 'styled-components';
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
  justify-content: center;
  overflow-y: auto;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: flex-start;
  max-height: calc(100vh - 120px);
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

export { PlayerContainer, StyledPlayer, Container, Main, ContentContainer, PlayerAlbumArt, PlayerAlbumArtPlaceholder };
