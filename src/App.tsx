import { styled } from 'styled-components';
import './App.css';
import Player from './Components/Player/Player';

function App() {
  return (
    <Container>
      <Main>app</Main>
      <Player />
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
`;

const Main = styled.div`
  background-color: #ffe1e0;
`;

export default App;
