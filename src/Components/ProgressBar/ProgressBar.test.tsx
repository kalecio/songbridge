import { render, fireEvent } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('reflects the initial progress prop on the slider', () => {
    const { getByRole } = render(<ProgressBar progress={30} max={100} />);
    expect(getByRole('slider')).toHaveValue('30');
  });

  it('updates the slider when the progress prop changes', () => {
    const { getByRole, rerender } = render(<ProgressBar progress={30} max={100} />);
    rerender(<ProgressBar progress={60} max={100} />);
    expect(getByRole('slider')).toHaveValue('60');
  });

  it('does not update from props while the user is dragging', () => {
    const { getByRole, rerender } = render(<ProgressBar progress={30} max={100} />);
    const slider = getByRole('slider');

    fireEvent.mouseDown(slider);
    rerender(<ProgressBar progress={60} max={100} />);

    // Prop changed but drag lock is active — value should stay at 30
    expect(slider).toHaveValue('30');
  });

  it('calls onSeek with the correct ratio (value / max) after a drag', () => {
    const onSeek = vi.fn();
    const { getByRole } = render(<ProgressBar progress={0} max={100} onSeek={onSeek} />);
    const slider = getByRole('slider');

    fireEvent.mouseDown(slider);
    fireEvent.change(slider, { target: { value: '50' } });
    fireEvent.mouseUp(slider);

    expect(onSeek).toHaveBeenCalledWith(0.5);
  });

  it('resumes accepting prop updates once dragging ends', () => {
    const { getByRole, rerender } = render(<ProgressBar progress={0} max={100} />);
    const slider = getByRole('slider');

    fireEvent.mouseDown(slider);
    fireEvent.change(slider, { target: { value: '50' } });
    fireEvent.mouseUp(slider);

    rerender(<ProgressBar progress={80} max={100} />);
    expect(slider).toHaveValue('80');
  });

  it('onTouchStart activates the same drag lock as onMouseDown', () => {
    const { getByRole, rerender } = render(<ProgressBar progress={10} max={100} />);
    const slider = getByRole('slider');

    fireEvent.touchStart(slider); // → handleMouseDown → isDraggingRef = true
    rerender(<ProgressBar progress={50} max={100} />);
    expect(slider).toHaveValue('10'); // prop update ignored while touch-dragging
  });
});
