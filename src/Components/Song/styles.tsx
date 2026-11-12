import { styled } from 'styled-components';
import AlbumPlaceholder from '../../assets/images/album-placeholder.svg';
import { selectable } from '../../styles/mixins';

const SongContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  flex: 1;
  flex-shrink: 1;
  max-width: 22rem;
`;

const AlbumImagePlaceholder = styled(AlbumPlaceholder)<{ $clickable?: boolean }>`
  width: 46px;
  flex-shrink: 0;
  height: 46px;
  border-radius: 0;
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
  width: 46px;
  flex-shrink: 0;
  height: 46px;
  object-fit: cover;
  border-radius: 0;
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
  padding: 0;
  gap: 5px;
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.textOnPlayer};
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const MusicName = styled.span`
  font-size: 12px;
  font-weight: 500;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
`;

const ArtistName = styled.span<{ $clickable?: boolean }>`
  font-size: 10px;
  color: ${({ theme }) => theme.textMuted};
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
