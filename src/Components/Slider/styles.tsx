import { styled } from 'styled-components';

const ProgressBarInner = styled.div<{ $height?: number }>`
  background-color: ${({ theme }) => theme.accent};
  width: 0; /* Adjust with JavaScript */
  height: ${(props) => props.$height || '3px'};
  border-radius: 10px;
`;

const CustomProgressBar = styled.div<{ $height?: number }>`
  background-color: ${({ theme }) => theme.borderLight};
  border-radius: 10px;
  padding: 0px;
  height: ${(props) => props.$height || '3px'};
  width: 100%;
`;

const SliderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  width: 120px;
  border-radius: 10px;
`;

const Slider = styled.input.attrs({ type: 'range' })<{ $height?: number }>`
  -webkit-appearance: none;
  width: 100%;
  max-width: 120px;
  /* Keep the visual track slim while giving mouse and touch input a larger target. */
  height: 32px;
  background: none;
  outline: none;
  opacity: 1;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  touch-action: pan-y;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 2px;
    border-radius: 10px;
  }

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

export { CustomProgressBar, ProgressBarInner, SliderContainer, Slider };
