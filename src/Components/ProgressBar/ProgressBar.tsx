import { useEffect, useState } from 'react';
import { ProgressBarInner, CustomProgressBar, Slider } from './styles';

interface ProgressBarProps {
  progress: number;
  max: number;
  onSeek: (_percent: number) => void;
}

const ProgressBar = ({ progress, max, onSeek }: ProgressBarProps) => {
  const [progressValue, setProgressValue] = useState(progress);

  useEffect(() => {
    setProgressValue(progress);
  }, [progress]);

  const handleProgressChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value);
    console.log('Progress changed in ProgressBar:', newValue);
    setProgressValue(newValue);
  };
  const handleProgressCommit = async () => {
    onSeek(progressValue / 100);
  };
  return (
    <CustomProgressBar>
      <ProgressBarInner style={{ width: `${progressValue}%` }} />
      <Slider
        value={progressValue}
        onChange={handleProgressChange}
        onMouseUp={handleProgressCommit}
        min={0}
        max={max}
      />
    </CustomProgressBar>
  );
};

export default ProgressBar;
