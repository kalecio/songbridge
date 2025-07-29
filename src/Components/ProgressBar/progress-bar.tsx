import './ProgressBar.css';
import { ProgressBarInner, StyledProgressBar } from './styles';

interface ProgressBarProps {
  progress: string;
}

const ProgressBar = ({ progress }: ProgressBarProps) => {
  return (
    <StyledProgressBar>
      <ProgressBarInner style={{ width: progress }} />
    </StyledProgressBar>
  );
};

export default ProgressBar;
