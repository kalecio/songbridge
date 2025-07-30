import {styled} from "styled-components";
import AlbumPlaceholder from "../../assets/images/album-placeholder.svg?react";

const SongContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 0.65rem;
  padding-left: 3rem;
`;

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

const MusicInfo = styled.div`
    padding: 15px 0px;
    width: 30%;
    display: flex;
    flex-direction: column;
    color: #f5f2f2;
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
    ArtistName
}