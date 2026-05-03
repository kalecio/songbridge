import { styled } from 'styled-components';
import AlbumPlaceholder from '../../assets/images/album-placeholder.svg';

const SongContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 0.65rem;
`;

const AlbumImagePlaceholder = styled(AlbumPlaceholder)`
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  display: block;
  object-fit: cover;
`;

const AlbumImagePlaceholderContainer = styled.div<{ $width?: string; $height?: string }>`
  width: ${(props) => props.$width || '25rem'};
  height: ${(props) => props.$height || '25rem'};
  cursor: pointer;
`;

const AlbumImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 10px;
`;

const MusicInfo = styled.div`
  padding: 15px 0px;
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.textOnPlayer};
`;

const MusicName = styled.span`
  font-size: 1.25rem;
  font-weight: bolder;
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const ArtistName = styled.span`
  font-size: 0.8rem;
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

export {
  SongContainer,
  AlbumImage,
  AlbumImagePlaceholder,
  MusicInfo,
  MusicName,
  ArtistName,
  AlbumImagePlaceholderContainer,
};
