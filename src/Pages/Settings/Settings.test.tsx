import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithContext } from '../../test/helpers';
import Settings from './Settings';

const mockInvoke = vi.fn().mockResolvedValue(undefined);
const mockOpen = vi.fn().mockResolvedValue('/music/new-folder');

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: (...args: unknown[]) => mockOpen(...args) }));

const paths = ['/music/rock', '/music/jazz'];

describe('Settings', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockOpen.mockClear();
  });

  it('renders the section title', () => {
    const { getByText } = renderWithContext(<Settings />);
    expect(getByText('Music Library Paths')).toBeInTheDocument();
  });

  describe('theme selector', () => {
    it('renders the Appearance section', () => {
      const { getByText } = renderWithContext(<Settings />);
      expect(getByText('Appearance')).toBeInTheDocument();
    });

    it('shows the current theme as the selected option', () => {
      const { getByRole } = renderWithContext(<Settings />, { currentTheme: 'Pastel Colors' });
      expect(getByRole('combobox')).toHaveValue('Pastel Colors');
    });

    it('calls setCurrentTheme when a different theme is selected', () => {
      const setCurrentTheme = vi.fn();
      const { getByRole } = renderWithContext(<Settings />, { currentTheme: 'Midnight', setCurrentTheme });
      fireEvent.change(getByRole('combobox'), { target: { value: 'Pastel Colors' } });
      expect(setCurrentTheme).toHaveBeenCalledWith('Pastel Colors');
    });
  });

  it('shows empty note when no paths are configured', () => {
    const { getByText } = renderWithContext(<Settings />, { libraryPaths: [] });
    expect(getByText(/default system music directory/i)).toBeInTheDocument();
  });

  it('renders each configured path', () => {
    const { getByText } = renderWithContext(<Settings />, { libraryPaths: paths });
    expect(getByText('/music/rock')).toBeInTheDocument();
    expect(getByText('/music/jazz')).toBeInTheDocument();
  });

  it('renders a remove button for each path', () => {
    const { getAllByRole } = renderWithContext(<Settings />, { libraryPaths: paths });
    const removeButtons = getAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(paths.length);
  });

  it('renders the add folder button', () => {
    const { getByRole } = renderWithContext(<Settings />);
    expect(getByRole('button', { name: /add folder/i })).toBeInTheDocument();
  });

  it('disables add folder button while scanning', () => {
    const { getByRole } = renderWithContext(<Settings />, { isScanning: true });
    expect(getByRole('button', { name: /add folder/i })).toBeDisabled();
  });

  it('clicking remove invokes db_remove_library_path with the correct path', async () => {
    const { getByRole } = renderWithContext(<Settings />, { libraryPaths: ['/music/rock'] });
    fireEvent.click(getByRole('button', { name: /remove \/music\/rock/i }));
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('db_remove_library_path', { path: '/music/rock' }));
  });

  it('clicking remove calls setLibraryPaths and scanLibrary without the removed path', async () => {
    const setLibraryPaths = vi.fn();
    const scanLibrary = vi.fn().mockResolvedValue(undefined);
    const { getByRole } = renderWithContext(<Settings />, {
      libraryPaths: paths,
      setLibraryPaths,
      scanLibrary,
    });
    fireEvent.click(getByRole('button', { name: /remove \/music\/rock/i }));
    await waitFor(() => {
      expect(setLibraryPaths).toHaveBeenCalledWith(['/music/jazz']);
      expect(scanLibrary).toHaveBeenCalledWith(['/music/jazz']);
    });
  });

  it('clicking add folder opens a directory picker', async () => {
    const { getByRole } = renderWithContext(<Settings />);
    fireEvent.click(getByRole('button', { name: /add folder/i }));
    await waitFor(() => expect(mockOpen).toHaveBeenCalledWith({ directory: true, multiple: false }));
  });

  it('clicking add folder invokes db_add_library_path with the chosen path', async () => {
    mockOpen.mockResolvedValueOnce('/music/new-folder');
    const { getByRole } = renderWithContext(<Settings />, { libraryPaths: [] });
    fireEvent.click(getByRole('button', { name: /add folder/i }));
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('db_add_library_path', { path: '/music/new-folder' }));
  });

  it('does not invoke anything when the folder picker is cancelled', async () => {
    mockOpen.mockResolvedValueOnce(null);
    const { getByRole } = renderWithContext(<Settings />);
    fireEvent.click(getByRole('button', { name: /add folder/i }));
    await waitFor(() => expect(mockInvoke).not.toHaveBeenCalled());
  });

  it('does not add a path that is already in the list', async () => {
    mockOpen.mockResolvedValueOnce('/music/rock');
    const { getByRole } = renderWithContext(<Settings />, { libraryPaths: ['/music/rock'] });
    fireEvent.click(getByRole('button', { name: /add folder/i }));
    await waitFor(() => expect(mockInvoke).not.toHaveBeenCalled());
  });

  it('calls setLibraryPaths and scanLibrary after adding a new folder', async () => {
    mockOpen.mockResolvedValueOnce('/music/new-folder');
    const setLibraryPaths = vi.fn();
    const scanLibrary = vi.fn().mockResolvedValue(undefined);
    const { getByRole } = renderWithContext(<Settings />, {
      libraryPaths: ['/music/rock'],
      setLibraryPaths,
      scanLibrary,
    });
    fireEvent.click(getByRole('button', { name: /add folder/i }));
    await waitFor(() => {
      expect(setLibraryPaths).toHaveBeenCalledWith(['/music/rock', '/music/new-folder']);
      expect(scanLibrary).toHaveBeenCalledWith(['/music/rock', '/music/new-folder']);
    });
  });
});
