import { FaPlus, FaAngleLeft } from 'react-icons/fa6';
import { styled } from 'styled-components';

const PlusButtonContainer = styled.div`
  cursor: pointer;
  width: fit-content;
  height: fit-content;
`;

const SidebarContainer = styled.div`
  background-color: #9b7ebd88;
  width: 30%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
`;

const BackIcon = styled(FaAngleLeft)`
  cursor: pointer;
  color: #f49bab;
  max-width: 60px;
  min-height: 30px;

  &:hover {
    color: #fff;
  }
`;

const PlusIcon = styled(FaPlus)`
  cursor: pointer;
  color: #f49bab;
  margin-left: 0.5rem;
  max-width: 60px;
  max-height: 30px;

  &:hover {
    color: #fff;
  }
`;

const Title = styled.div`
  color: #fff;
  display: flex;
  justify-content: space-between;
  height: fit-content;
  font-weight: bold;
`;

const Menu = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const MenuItem = styled.div`
  color: #fff;
  cursor: pointer;
  height: fit-content;
  padding: 0.5rem 0;
  padding-left: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;

  &:hover {
    color: #f49bab;
  }
`;

export { SidebarContainer, PlusIcon, BackIcon, PlusButtonContainer, Title, Menu, MenuItem };
