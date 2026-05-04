import { styled } from 'styled-components';

const ProgressBarInner = styled.div`
  background-color: ${({ theme }) => theme.accent};
  width: 0; /* Adjust with JavaScript */
  height: 20px;
  border-radius: 0px 10px 10px 0px;
`;

const CustomProgressBar = styled.div`
  background-color: ${({ theme }) => theme.primaryDark};
  border-radius: 0px;
  padding: 0px;
  height: 20px;
  position: relative;
  display: flex;
  width: 100%;
`;

const Slider = styled.input.attrs({ type: 'range' })<{ $height?: number }>`
  -webkit-appearance: none;
  width: 100%;
  height: ${(props) => props.$height || '20px'};
  background: none;
  outline: none;
  opacity: 1;
  position: absolute;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0px;
    height: 0px;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 0px;
    height: 0px;
    cursor: pointer;
  }
`;

export { CustomProgressBar, ProgressBarInner, Slider };
