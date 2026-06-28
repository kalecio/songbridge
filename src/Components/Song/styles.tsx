import { styled } from 'styled-components';
import AlbumPlaceholder from '../../assets/images/album-placeholder.svg';
import { selectable } from '../../styles/mixins';

const SongContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 0.65rem;
  min-width: 200px;
  flex-shrink: 0;
  max-width: 22rem;
`;

const AlbumImagePlaceholder = styled(AlbumPlaceholder)<{ $clickable?: boolean }>`
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  display: block;
  object-fit: cover;
  ${(p) =>
    p.$clickable &&
    `
    cursor: pointer;
    transition: filter 0.15s, transform 0.15s;
    &:hover { filter: brightness(1.1); }
    &:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  `}
`;

const AlbumImagePlaceholderContainer = styled.div<{ $width?: string; $height?: string }>`
  width: ${(props) => props.$width || '25rem'};
  height: ${(props) => props.$height || '25rem'};
  cursor: pointer;
`;

const AlbumImage = styled.img<{ $clickable?: boolean }>`
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 10px;
  ${(p) =>
    p.$clickable &&
    `
    cursor: pointer;
    transition: filter 0.15s, transform 0.15s;
    &:hover { filter: brightness(1.1); }
    &:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  `}
`;

const MusicInfo = styled.div`
  padding: 15px 0px;
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.textOnPlayer};
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const MusicName = styled.span`
  font-size: 1.25rem;
  font-weight: bolder;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
`;

const ArtistName = styled.span<{ $clickable?: boolean }>`
  font-size: 0.8rem;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
  ${(p) =>
    p.$clickable &&
    `
    cursor: pointer;
    &:hover { text-decoration: underline; }
  `}
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
