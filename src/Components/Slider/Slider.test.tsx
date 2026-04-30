import { render, fireEvent } from '@testing-library/react';
import CustomSlider from './Slider';

describe('Slider', () => {
  it('renders the range input with the correct value', () => {
    const { getByRole } = render(<CustomSlider value={50} min={0} max={100} />);
    expect(getByRole('slider')).toHaveValue('50');
  });

  it('sets the inner progress bar width proportionally', () => {
    // value=25, min=0, max=100 → (25-0)/(100-0)*100 = 25%
    const { container } = render(<CustomSlider value={25} min={0} max={100} />);
    const inner = container.querySelector<HTMLElement>('[style]');
    expect(inner?.style.width).toBe('25%');
  });

  it('handles a non-zero minimum in the width calculation', () => {
    // value=50, min=0, max=200 → 25%
    const { container } = render(<CustomSlider value={50} min={0} max={200} />);
    const inner = container.querySelector<HTMLElement>('[style]');
    expect(inner?.style.width).toBe('25%');
  });

  it('calls onChange when the slider value changes', () => {
    const onChange = vi.fn();
    const { getByRole } = render(<CustomSlider value={50} min={0} max={100} onChange={onChange} />);
    fireEvent.change(getByRole('slider'), { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
