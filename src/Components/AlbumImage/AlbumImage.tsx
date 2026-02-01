import { MetadataType } from '../../types';
import { PlayerAlbumArt, PlayerAlbumArtPlaceholder } from '../Player/styles';
import { AlbumImagePlaceholderContainer } from '../Song/styles';

const AlbumImage = ({
  metadata,
  onClick,
  height,
  width,
}: {
  metadata?: MetadataType;
  onClick?: () => void;
  height?: string;
  width?: string;
}) => {
  return (
    <>
      {metadata?.image ? (
        <PlayerAlbumArt $height={height} $width={width} src={metadata?.image} alt={metadata?.album} onClick={onClick} />
      ) : (
        <AlbumImagePlaceholderContainer onClick={onClick} $height={height} $width={width}>
          <PlayerAlbumArtPlaceholder $height={height} $width={width} />
        </AlbumImagePlaceholderContainer>
      )}
    </>
  );
};

export default AlbumImage;
