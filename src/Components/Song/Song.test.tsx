import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import SongComponent from './Song';

const renderWithRouter = (ui: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/artists/:id" element={<div>Artist page</div>} />
        <Route path="/albums/:id" element={<div>Album page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('Song', () => {
  it('renders the song name and artist name', () => {
    const { getByText } = renderWithRouter(<SongComponent songName="Roundabout" artistName="Yes" />);
    expect(getByText('Roundabout')).toBeInTheDocument();
    expect(getByText('Yes')).toBeInTheDocument();
  });

  it('renders an img with the correct src and alt when albumImage is provided', () => {
    const { getByAltText } = renderWithRouter(
      <SongComponent
        songName="Roundabout"
        artistName="Yes"
        albumImage="data:image/png;base64,xyz"
        albumName="Fragile"
      />,
    );
    const img = getByAltText('Fragile');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,xyz');
  });

  it('navigates to the album page when the album art is clicked', () => {
    const { getByLabelText, getByText } = renderWithRouter(
      <SongComponent
        songName="Roundabout"
        artistName="Yes"
        albumImage="data:image/png;base64,xyz"
        albumName="Fragile"
      />,
    );
    fireEvent.click(getByLabelText('Open album Fragile'));
    expect(getByText('Album page')).toBeInTheDocument();
  });

  it('does not link the album art when albumName is missing', () => {
    const { queryByLabelText } = renderWithRouter(
      <SongComponent songName="Roundabout" artistName="Yes" albumImage="data:image/png;base64,xyz" />,
    );
    expect(queryByLabelText(/Open album/)).not.toBeInTheDocument();
  });

  it('does not crash when albumName is null (Tauri can deserialize missing Option<String> as null)', () => {
    const { queryByLabelText } = renderWithRouter(
      <SongComponent songName="Roundabout" artistName="Yes" albumImage="data:image/png;base64,xyz" albumName={null} />,
    );
    expect(queryByLabelText(/Open album/)).not.toBeInTheDocument();
  });

  it('renders the SVG placeholder when no albumImage is provided', () => {
    const { getByTestId } = renderWithRouter(<SongComponent songName="Roundabout" artistName="Yes" />);
    expect(getByTestId('svg-mock')).toBeInTheDocument();
  });

  it('navigates to the artist page when the artist name is clicked', () => {
    const { getByText } = renderWithRouter(<SongComponent songName="Roundabout" artistName="Yes" />);
    fireEvent.click(getByText('Yes'));
    expect(getByText('Artist page')).toBeInTheDocument();
  });

  it('does not link the placeholder "no name" artist', () => {
    const { getByText } = renderWithRouter(<SongComponent songName="Roundabout" artistName="no name" />);
    const artist = getByText('no name');
    expect(artist).not.toHaveAttribute('role', 'link');
    fireEvent.click(artist);
    // Still on the home route, no navigation happened.
    expect(getByText('Roundabout')).toBeInTheDocument();
  });
});
