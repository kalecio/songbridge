import { useState } from 'react';
import { ProgressBarInner, CustomProgressBar, Slider } from './styles';

interface ProgressBarProps {
  progress: number;
  max: number;
}

const ProgressBar = ({ progress, max }: ProgressBarProps) => {
  const [progressValue, setProgressValue] = useState(progress);

  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value);
    setProgressValue(newValue);
  };

  return (
    <CustomProgressBar>
      <ProgressBarInner style={{ width: `${progressValue}%` }} />
      <Slider value={progressValue} onChange={handleProgressChange} min={0} max={max} />
    </CustomProgressBar>
  );
};

export default ProgressBar;
