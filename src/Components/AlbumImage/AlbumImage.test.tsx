import { render, fireEvent } from '@testing-library/react';
import AlbumImage from './AlbumImage';

describe('AlbumImage', () => {
  it('renders an img with src and alt when metadata has an image', () => {
    const metadata = { image: 'data:image/jpeg;base64,abc', album: 'My Album' };
    const { getByRole } = render(<AlbumImage metadata={metadata} />);
    const img = getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,abc');
    expect(img).toHaveAttribute('alt', 'My Album');
  });

  it('renders the placeholder container when metadata has no image', () => {
    const { getByTestId } = render(<AlbumImage metadata={{}} />);
    expect(getByTestId('album-placeholder-container')).toBeInTheDocument();
  });

  it('renders the placeholder container when no metadata is provided', () => {
    const { getByTestId } = render(<AlbumImage />);
    expect(getByTestId('album-placeholder-container')).toBeInTheDocument();
  });

  it('calls onClick when the album image is clicked', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<AlbumImage metadata={{ image: 'data:image/jpeg;base64,abc' }} onClick={onClick} />);
    fireEvent.click(getByRole('img'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when the placeholder container is clicked', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(<AlbumImage onClick={onClick} />);
    fireEvent.click(getByTestId('album-placeholder-container'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
