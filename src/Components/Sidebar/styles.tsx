import { FaPlus, FaAngleLeft } from 'react-icons/fa6';
import { styled } from 'styled-components';

const PlusButtonContainer = styled.div`
  cursor: pointer;
  width: fit-content;
  height: fit-content;
`;

const SidebarContainer = styled.div`
<<<<<<< HEAD
  overflow-y: auto;
=======
>>>>>>> a93b473 (feat: add sidebar and music queue)
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

<<<<<<< HEAD
const MenuItem = styled.div<{ $active?: boolean }>`
=======
const MenuItem = styled.div`
>>>>>>> a93b473 (feat: add sidebar and music queue)
  color: #fff;
  cursor: pointer;
  height: fit-content;
  padding: 0.5rem 0;
  padding-left: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
<<<<<<< HEAD
  border-radius: 1rem;
  padding: 0.5rem;

  background-color: ${(props) => (props.$active ? '#f49bab' : 'unset')};

  &:hover {
    color: ${(props) => (props.$active ? '#7f55b1' : '#f49bab')};
=======

  &:hover {
    color: #f49bab;
>>>>>>> a93b473 (feat: add sidebar and music queue)
  }
`;

export { SidebarContainer, PlusIcon, BackIcon, PlusButtonContainer, Title, Menu, MenuItem };
