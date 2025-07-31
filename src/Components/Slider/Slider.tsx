import { CustomProgressBar, ProgressBarInner, Slider, SliderContainer } from './styles';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  height?: number;
  onChange?: () => void;
}

const CustomSlider = ({ value, min, max, height, onChange }: SliderProps) => (
  <SliderContainer>
    <CustomProgressBar $height={height}>
      <ProgressBarInner $height={height} style={{ width: `${value}%` }} />
    </CustomProgressBar>
    <Slider value={value} onChange={onChange} min={min} max={max} $height={height} />
  </SliderContainer>
);

export default CustomSlider;
