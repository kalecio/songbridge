import { useId } from 'react';
import { styled } from 'styled-components';
import { useLyricsFontSize, MIN_LYRICS_FONT_SIZE, MAX_LYRICS_FONT_SIZE } from '../../hooks/useLyricsFontSize';

const Control = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
  label {
    color: ${({ theme }) => theme.textPrimary};
  }
  input {
    width: clamp(100px, 15vw, 180px);
    accent-color: ${({ theme }) => theme.accent};
    cursor: pointer;
  }
  output {
    min-width: 40px;
    font-variant-numeric: tabular-nums;
  }
  button {
    background: transparent;
    color: ${({ theme }) => theme.accent};
    font: inherit;
    border: 1px solid ${({ theme }) => theme.borderLight};
    border-radius: 5px;
    padding: 5px 8px;
    cursor: pointer;
  }
`;
export default function LyricsFontControl() {
  const id = useId();
  const { fontSize, setFontSize, resetFontSize } = useLyricsFontSize();
  return (
    <Control>
      <label htmlFor={id}>Lyrics font size</label>
      <input
        id={id}
        type="range"
        min={MIN_LYRICS_FONT_SIZE}
        max={MAX_LYRICS_FONT_SIZE}
        step={1}
        value={fontSize}
        aria-valuetext={`${fontSize} pixels`}
        onChange={(event) => setFontSize(Number(event.target.value))}
      />
      <output htmlFor={id} aria-live="polite">
        {fontSize} px
      </output>
      <button type="button" onClick={resetFontSize}>
        Reset lyrics font size
      </button>
    </Control>
  );
}
