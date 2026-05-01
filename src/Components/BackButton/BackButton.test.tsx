import { render, fireEvent } from '@testing-library/react';
import BackButton from './BackButton';

describe('BackButton', () => {
  it('renders children text', () => {
    const { getByText } = render(<BackButton onClick={() => {}}>Artists</BackButton>);
    expect(getByText('Artists')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<BackButton onClick={onClick}>Go back</BackButton>);
    fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the angle-left icon', () => {
    const { container } = render(<BackButton onClick={() => {}}>Back</BackButton>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
