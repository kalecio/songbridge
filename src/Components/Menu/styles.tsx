import { styled } from 'styled-components';
import { FaHouse, FaRecordVinyl, FaHeart, FaMusic, FaCrown } from 'react-icons/fa6';

const MenuItem = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 15px;
  max-height: 3rem;
  padding: 0 4rem;
  align-items: center;
`;

const MenuContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
`;

const MenuTitle = styled.span`
  font-size: 1.2rem;
  font-weight: bold;
  padding: 1rem 3rem;
  max-height: 3rem;
  margin-bottom: 10px;
`;

const HomeIcon = styled(FaHouse)`
  width: 25px;
  height: 25px;
  color: #f49bab;
`;

const AlbumIcon = styled(FaRecordVinyl)`
  width: 25px;
  height: 25px;
  color: #f49bab;
`;

const FavoriteIcon = styled(FaHeart)`
  width: 25px;
  height: 25px;
  color: #f49bab;
`;

const SongIcon = styled(FaMusic)`
  width: 25px;
  height: 25px;
  color: #f49bab;
`;

const ArtistIcon = styled(FaCrown)`
  width: 25px;
  height: 25px;
  color: #f49bab;
`;

export { HomeIcon, AlbumIcon, FavoriteIcon, SongIcon, ArtistIcon, MenuItem, MenuContainer, MenuTitle };
