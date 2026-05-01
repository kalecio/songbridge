import { styled } from 'styled-components';
import AlbumPlaceholder from '../../assets/images/album-placeholder.svg';

const AlbumImagePlaceholder = styled(AlbumPlaceholder)`
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  display: block;
  object-fit: cover;
`;

const AlbumImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 10px;
`;

const PlayerAlbumArt = styled(AlbumImage)<{ $height?: string; $width?: string }>`
  cursor: pointer;
  width: ${(props) => props.$width || '25rem'};
  height: ${(props) => props.$height || '25rem'};
  object-fit: cover;
`;

const PlayerAlbumArtPlaceholder = styled(AlbumImagePlaceholder)<{ $height?: string; $width?: string }>`
  width: ${(props) => props.$width || '25rem'};
  height: ${(props) => props.$height || '25rem'};
`;

const AlbumImagePlaceholderContainer = styled.div<{ $width?: string; $height?: string }>`
  width: ${(props) => props.$width || '25rem'};
  height: ${(props) => props.$height || '25rem'};
  cursor: pointer;
`;

export { PlayerAlbumArt, PlayerAlbumArtPlaceholder, AlbumImagePlaceholderContainer };
