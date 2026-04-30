import { render } from '@testing-library/react';
import SongComponent from './Song';

describe('Song', () => {
  it('renders the song name and artist name', () => {
    const { getByText } = render(<SongComponent songName="Roundabout" artistName="Yes" />);
    expect(getByText('Roundabout')).toBeInTheDocument();
    expect(getByText('Yes')).toBeInTheDocument();
  });

  it('renders an img with the correct src and alt when albumImage is provided', () => {
    const { getByRole } = render(
      <SongComponent
        songName="Roundabout"
        artistName="Yes"
        albumImage="data:image/png;base64,xyz"
        albumName="Fragile"
      />,
    );
    const img = getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,xyz');
    expect(img).toHaveAttribute('alt', 'Fragile');
  });

  it('renders the SVG placeholder when no albumImage is provided', () => {
    const { getByTestId } = render(<SongComponent songName="Roundabout" artistName="Yes" />);
    expect(getByTestId('svg-mock')).toBeInTheDocument();
  });
});
