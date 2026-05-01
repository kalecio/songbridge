import { render, fireEvent, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import Volume from './Volume';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

const mockInvoke = vi.mocked(invoke);

describe('Volume', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  it('shows the VolumeHigh icon at the default volume (70)', () => {
    const { getByLabelText } = render(<Volume />);
    expect(getByLabelText('volume-high')).toBeInTheDocument();
  });

  it('shows VolumeOff icon when volume is below 33', () => {
    const { getByRole, getByLabelText } = render(<Volume />);
    const slider = getByRole('slider');
    fireEvent.change(slider, { target: { value: '10' } });
    expect(getByLabelText('volume-off')).toBeInTheDocument();
  });

  it('shows VolumeLow icon when volume is between 33 and 65', () => {
    const { getByRole, getByLabelText } = render(<Volume />);
    const slider = getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });
    expect(getByLabelText('volume-low')).toBeInTheDocument();
  });

  it('calls set_volume with value / 100 when slider changes', () => {
    const { getByRole } = render(<Volume />);
    fireEvent.change(getByRole('slider'), { target: { value: '40' } });
    expect(mockInvoke).toHaveBeenCalledWith('set_volume', { volume: 0.4 });
  });

  it('shows VolumeXmark and calls toggle_mute when volume icon is clicked', async () => {
    const { getByLabelText } = render(<Volume />);
    fireEvent.click(getByLabelText('volume-high'));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('toggle_mute');
      expect(getByLabelText('volume-muted')).toBeInTheDocument();
    });
  });

  it('restores the volume icon when VolumeXmark is clicked again', async () => {
    const { getByLabelText } = render(<Volume />);
    fireEvent.click(getByLabelText('volume-high')); // mute
    await waitFor(() => expect(getByLabelText('volume-muted')).toBeInTheDocument());
    fireEvent.click(getByLabelText('volume-muted')); // unmute
    await waitFor(() => expect(getByLabelText('volume-high')).toBeInTheDocument());
  });

  it('toggles the favorite state when heart is clicked', () => {
    const { getByLabelText } = render(<Volume />);
    const heart = getByLabelText('favorite');
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(heart);
    expect(heart).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(heart);
    expect(heart).toHaveAttribute('aria-pressed', 'false');
  });
});
