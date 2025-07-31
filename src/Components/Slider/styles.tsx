import { styled } from 'styled-components';

const ProgressBarInner = styled.div<{ $height?: number; }>`
  background-color: #f49bab;
  width: 0; /* Adjust with JavaScript */
  height: ${(props) => props.$height || "15px"};
  border-radius: 10px;
`;

const CustomProgressBar = styled.div<{ $height?: number; }>`
  background-color: #7f55b1;
  border-radius: 10px;
  padding: 0px;
  height: ${(props) => props.$height || "15px"};
`;

const SliderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  max-width: 120px;
  border-radius: 10px;
`;

const Slider = styled.input.attrs({ type: "range" })<{ $height?: number; }>`
    -webkit-appearance: none;
    width: 100%;
    max-width: 120px;
    height: ${(props) => props.$height || "15px"};
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
`

export { CustomProgressBar, ProgressBarInner, SliderContainer, Slider };
