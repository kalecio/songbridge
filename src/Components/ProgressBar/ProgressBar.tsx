import { useState, useEffect, useRef } from 'react';
import { ProgressBarInner, CustomProgressBar, Slider } from './styles';

interface ProgressBarProps {
  progress: number;
  max: number;
  onSeek?: (_progress: number) => void;
}

const ProgressBar = ({ progress, max, onSeek }: ProgressBarProps) => {
  const [progressValue, setProgressValue] = useState(progress);
  const isDraggingRef = useRef(false);

  // Update internal state when progress prop changes (but not while dragging)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setProgressValue(progress);
    }
  }, [progress]);

  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value);
    setProgressValue(newValue);
  };

  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      // Convert percentage (0-100) to progress (0-1)
      const progressRatio = progressValue / max;
      onSeek?.(progressRatio);
      isDraggingRef.current = false;
    }
  };

  return (
    <CustomProgressBar>
      <ProgressBarInner style={{ width: `${progressValue}%` }} />
      <Slider
        value={progressValue}
        onChange={handleProgressChange}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        min={0}
        max={max}
      />
    </CustomProgressBar>
  );
};

export default ProgressBar;
