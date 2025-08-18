import { styled } from 'styled-components';
import './App.css';
import Player from './Components/Player/Player';
import Main from './Components/Main/Main';

function App() {
  return (
    <Container>
      <Main />
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

export default App;
