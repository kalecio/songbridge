import { useState } from "react";
import { CustomProgressBar, ProgressBarInner, Slider, SliderContainer } from "./styles";


interface SliderProps {
  value: number;
  min: number;
  max: number;
  height?: number;
}

const CustomSlider = ({ value, min, max, height }: SliderProps) => {
  const [sliderValue, setValue] = useState(value);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value);
    setValue(newValue);
  };

  return (
    <SliderContainer>
        <CustomProgressBar $height={height}>
            <ProgressBarInner $height={height} style={{ width: `${sliderValue}%` }} />
        </CustomProgressBar>
        <Slider value={sliderValue} onChange={handleSliderChange} min={min} max={max} $height={height} />
    </SliderContainer>
  );
};



export default CustomSlider;
