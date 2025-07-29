import styled from "styled-components";


const ProgressBarInner = styled.div`
  background-color: #F49BAB;
  width: 0; /* Adjust with JavaScript */
  height: 20px;
  border-radius: 0px 10px 10px 0px;
`;

const StyledProgressBar = styled.div`
  background-color: #7F55B1;
  border-radius: 0px;
  padding: 0px;
  height: 20px;
`;

export {
    StyledProgressBar,
    ProgressBarInner
}