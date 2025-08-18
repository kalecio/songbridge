import { AlbumIcon, ArtistIcon, FavoriteIcon, HomeIcon, MenuContainer, MenuItem, MenuTitle, SongIcon } from './styles';

function Menu() {
  return (
    <MenuContainer>
      <MenuTitle>Menu</MenuTitle>
      <MenuContainer>
        <MenuItem>
          <HomeIcon /> Home
        </MenuItem>
        <MenuItem>
          <ArtistIcon /> Artists
        </MenuItem>
        <MenuItem>
          <AlbumIcon /> Albuns
        </MenuItem>
        <MenuItem>
          <SongIcon /> Songs
        </MenuItem>
        <MenuItem>
          <FavoriteIcon /> Favorites
        </MenuItem>
      </MenuContainer>
    </MenuContainer>
  );
}

export default Menu;
