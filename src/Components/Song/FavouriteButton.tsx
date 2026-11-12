import { useContext } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa6';
import { styled } from 'styled-components';
import { AppContext } from '../../Context/AppContext';
import { useFavourites } from '../../hooks/useFavourites';
import { MetadataType } from '../../types';

const Button = styled.button`
  background: none;
  border: 0;
  padding: 8px;
  cursor: pointer;
  display: inline-flex;
  color: ${({ theme }) => theme.textSecondary};
  &[aria-pressed='true'] {
    color: ${({ theme }) => theme.accent};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
  svg {
    width: 15px;
    height: 15px;
  }
`;
export default function FavouriteButton({ song }: { song?: MetadataType }) {
  const { currentPath, metadata, library } = useContext(AppContext);
  const { isFavourite, toggleFavourite } = useFavourites();
  const track = song ?? library.find((item) => item.path === currentPath) ?? { ...metadata, path: currentPath };
  const active = isFavourite(track.path);
  return (
    <Button
      type="button"
      aria-label={active ? 'remove from favourites' : 'add to favourites'}
      aria-pressed={active}
      aria-disabled={!track.path}
      disabled={!track.path}
      onClick={() => toggleFavourite(track)}
    >
      {active ? <FaHeart /> : <FaRegHeart />}
    </Button>
  );
}
