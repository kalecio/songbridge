import Sidebar from '../Sidebar/Sidebar';
import { Container, MainContent } from './styles';

function Main() {
  return (
    <Container>
      <Sidebar />
      <MainContent>Main Content</MainContent>
    </Container>
  );
}

export default Main;
