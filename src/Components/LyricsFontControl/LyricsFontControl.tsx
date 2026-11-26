import { useId } from 'react';
import { styled } from 'styled-components';
import { useLyricsFontSize, MIN_LYRICS_FONT_SIZE, MAX_LYRICS_FONT_SIZE } from '../../hooks/useLyricsFontSize';
import { useI18n } from '../../i18n/I18nProvider';

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
  const { t } = useI18n();
  const { fontSize, setFontSize, resetFontSize } = useLyricsFontSize();
  return (
    <Control>
      <label htmlFor={id}>{t('settings.lyricsFontSize')}</label>
      <input
        id={id}
        type="range"
        min={MIN_LYRICS_FONT_SIZE}
        max={MAX_LYRICS_FONT_SIZE}
        step={1}
        value={fontSize}
        aria-valuetext={t('settings.fontSizePixels', { size: fontSize })}
        onChange={(event) => setFontSize(Number(event.target.value))}
      />
      <output htmlFor={id} aria-live="polite">
        {t('settings.fontSizePixels', { size: fontSize })}
      </output>
      <button type="button" onClick={resetFontSize}>
        {t('settings.resetLyricsFontSize')}
      </button>
    </Control>
  );
}
