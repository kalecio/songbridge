import { styled } from 'styled-components';

export const HomePage = styled.div`
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  padding: clamp(24px, 4vw, 58px) clamp(24px, 4.2vw, 72px) 48px;
  display: flex;
  flex-direction: column;
`;

export const HomeTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: clamp(24px, 4vh, 40px);

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const HomeHeading = styled.div`
  p {
    margin: 0 0 10px;
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    color: ${({ theme }) => theme.textPrimary};
    font-size: clamp(2rem, 3.2vw, 3rem);
    font-weight: 700;
    letter-spacing: -0.06em;
    line-height: 1.05;
  }
`;

export const ModeSwitch = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.surface};
  flex-shrink: 0;
`;

export const ModeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 15px;
  border: 0;
  border-radius: 999px;
  background: ${({ $active, theme }) => ($active ? theme.active : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.accent : theme.textSecondary)};
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.accent};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 2px;
  }
`;

export const VisualizerSelect = styled.select`
  min-height: 42px;
  min-width: 180px;
  padding: 0 36px 0 14px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.textPrimary};
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 2px;
  }
`;

export const PresetComboboxFrame = styled.div`
  position: relative;
  width: min(340px, 100%);
  min-width: min(250px, 100%);
  z-index: 4;
`;

export const PresetInput = styled.input`
  box-sizing: border-box;
  width: 100%;
  min-height: 42px;
  padding: 0 38px 0 14px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.textPrimary};
  font: inherit;
  font-size: 0.78rem;
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.accent};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.accentBg};
  }
  &:disabled {
    opacity: 0.55;
  }
`;

export const PresetList = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: min(420px, 55vh);
  overflow-y: auto;
  padding: 7px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.surfaceRaised};
  box-shadow: 0 16px 42px ${({ theme }) => theme.cardShadow};
`;

export const PresetSectionLabel = styled.div`
  padding: 8px 10px 5px;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const PresetOptionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const PresetOption = styled.button`
  flex: 1;
  min-width: 0;
  min-height: 36px;
  padding: 7px 10px;
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.textPrimary};
  font: inherit;
  font-size: 0.78rem;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  &[aria-selected='true'] {
    background: ${({ theme }) => theme.active};
    color: ${({ theme }) => theme.accent};
  }
  &:hover, &:focus-visible {
    background: ${({ theme }) => theme.active};
    outline: none;
  }
`;

export const PresetFavoriteButton = styled.button`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;
  &:hover, &:focus-visible {
    background: ${({ theme }) => theme.active};
    color: ${({ theme }) => theme.accent};
    outline: none;
  }
`;

export const Experience = styled.section`
  position: relative;
  flex: 1;
  min-height: min(520px, 58vh);
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 20px;
  background:
    radial-gradient(ellipse at 50% 40%, ${({ theme }) => theme.accentBg}, transparent 55%),
    ${({ theme }) => theme.surface};
`;

export const ArtworkStage = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(28px, 5vw, 76px);
  width: min(900px, calc(100% - 56px));
  padding: 28px 0;

  @media (max-width: 720px) {
    flex-direction: column;
    text-align: center;
  }
`;

export const ArtworkFrame = styled.div`
  width: min(36vw, 360px);
  aspect-ratio: 1;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.surfaceRaised};
  box-shadow: 0 28px 70px ${({ theme }) => theme.cardShadow};

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 720px) {
    width: min(58vw, 300px);
  }
`;

export const ArtworkFallback = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.accent};
  background: linear-gradient(145deg, ${({ theme }) => theme.active}, ${({ theme }) => theme.surfaceRaised});
  font-size: clamp(3rem, 9vw, 7rem);
  font-weight: 700;
`;

export const TrackInfo = styled.div`
  min-width: 0;
  max-width: 420px;
  .eyebrow {
    margin: 0 0 12px;
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0;
    overflow-wrap: anywhere;
    color: ${({ theme }) => theme.textPrimary};
    font-size: clamp(1.8rem, 3.7vw, 3.4rem);
    font-weight: 700;
    letter-spacing: -0.055em;
    line-height: 1.05;
  }
  .artist {
    margin: 14px 0 0;
    color: ${({ theme }) => theme.textSecondary};
    font-size: clamp(1rem, 1.4vw, 1.25rem);
  }
  .album {
    margin: 7px 0 0;
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.9rem;
  }
`;

export const VisualizerStage = styled.div`
  position: absolute;
  inset: 0;
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
`;

export const VisualizerCaption = styled.div`
  position: absolute;
  left: clamp(22px, 3vw, 44px);
  bottom: clamp(20px, 3vw, 40px);
  z-index: 1;
  max-width: calc(100% - 44px);
  .eyebrow {
    margin: 0 0 7px;
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  strong {
    display: block;
    color: ${({ theme }) => theme.textPrimary};
    font-size: clamp(1rem, 1.8vw, 1.35rem);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  span {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 0.8rem;
  }
`;

export const EmptyState = styled.div`
  max-width: 460px;
  padding: 28px;
  text-align: center;
  h2 {
    margin: 0;
    color: ${({ theme }) => theme.textPrimary};
    font-size: 1.4rem;
  }
  p {
    margin: 10px 0 0;
    color: ${({ theme }) => theme.textSecondary};
    line-height: 1.6;
  }
`;
