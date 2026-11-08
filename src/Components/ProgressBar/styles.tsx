import { styled } from 'styled-components';

const ProgressBarInner = styled.div`
  background-color: ${({ theme }) => theme.accent};
  width: 0; /* Adjust with JavaScript */
  height: 3px;
  border-radius: 0;
`;

const CustomProgressBar = styled.div`
  background-color: ${({ theme }) => theme.borderLight};
  border-radius: 0px;
  padding: 0px;
  height: 3px;
  position: relative;
  display: flex;
  width: 100%;
`;

const Slider = styled.input.attrs({ type: 'range' })<{ $height?: number }>`
  -webkit-appearance: none;
  width: 100%;
  height: 16px;
  top: -6px;
  cursor: pointer;
  background: none;
  outline: none;
  opacity: 1;
  position: absolute;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 3px;
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

export { CustomProgressBar, ProgressBarInner, Slider };
