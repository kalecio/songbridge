import { styled } from 'styled-components';

const PlayerContainer = styled.div`
  background-color: #9b7ebd;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 120px;
  max-height: 10%;
`;

const StyledPlayer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

export { PlayerContainer, StyledPlayer };
