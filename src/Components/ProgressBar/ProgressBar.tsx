import { useState, useEffect, useRef } from 'react';
import { ProgressBarInner, CustomProgressBar, Slider } from './styles';

interface ProgressBarProps {
  progress: number;
  max: number;
  onSeek?: (_progress: number) => void;
}

const ProgressBar = ({ progress = 0, max, onSeek }: ProgressBarProps) => {
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

  const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const seekKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
    if (seekKeys.includes(event.key)) {
      onSeek?.(Number(event.currentTarget.value) / max);
    }
  };

  return (
    <CustomProgressBar>
      <ProgressBarInner style={{ width: `${progressValue}%` }} />
      <Slider
        aria-label="Playback position"
        value={progressValue}
        onChange={handleProgressChange}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onKeyUp={handleKeyUp}
        min={0}
        max={max}
      />
    </CustomProgressBar>
  );
};

export default ProgressBar;
