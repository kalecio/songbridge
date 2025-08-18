import { styled } from 'styled-components';

const SidebarContainer = styled.div`
  background-color: #9b7ebd;
  width: 25%;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem 0rem;
`;

const Logo = styled.img`
  width: 100px;
  height: 100px;
  margin-bottom: 20px;
  margin-top: 20px;
  align-self: flex-start;
  margin-left: 2rem;
`;

export { SidebarContainer, Logo };
