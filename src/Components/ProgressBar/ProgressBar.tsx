import { ProgressBarInner, CustomProgressBar } from './styles';

interface ProgressBarProps {
  progress: string;
}

const ProgressBar = ({ progress }: ProgressBarProps) => {
  return (
    <CustomProgressBar>
      <ProgressBarInner style={{ width: progress }} />
    </CustomProgressBar>
  );
};

export default ProgressBar;
