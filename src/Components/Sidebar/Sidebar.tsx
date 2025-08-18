import Menu from '../Menu/Menu';
import { Logo, SidebarContainer } from './styles';
import logo from '../../assets/images/logo.png';

function Sidebar() {
  return (
    <SidebarContainer>
      <Logo src={logo} alt="Logo" />
      <Menu />
      <Menu />
    </SidebarContainer>
  );
}

export default Sidebar;
