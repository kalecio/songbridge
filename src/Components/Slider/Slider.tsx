import { CustomProgressBar, ProgressBarInner, Slider, SliderContainer } from './styles';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  height?: number;
  onChange?: (_event: React.ChangeEvent<HTMLInputElement>) => void;
}

const CustomSlider = ({ value, min, max, height, onChange }: SliderProps) => {
  return (
    <SliderContainer>
      <CustomProgressBar $height={height}>
        <ProgressBarInner $height={height} style={{ width: `${value}%` }} />
      </CustomProgressBar>
      <Slider value={value} onChange={(event) => onChange?.(event)} min={min} max={max} $height={height} />
    </SliderContainer>
  );
};

export default CustomSlider;
