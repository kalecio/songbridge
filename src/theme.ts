export interface AppTheme {
  name: string;

  // Brand
  primary: string;
  primaryDark: string;
  primaryDeep: string;

  // Backgrounds
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  textOnPlayer: string;

  // Interactive states
  hover: string;
  hoverActive: string;
  active: string;

  // Borders
  border: string;
  borderLight: string;

  // Accent (controls, icons, active track highlights)
  accent: string;
  accentBg: string;
  accentBgHover: string;
  accentHover: string;
  mutedAccent: string;

  // Cards
  cardBackground: string;
  cardShadow: string;
  cardShadowHover: string;

  // Functional
  success: string;
  warning: string;
  error: string;

  // Player bar
  playerBar: string;
}

export const pastelTheme: AppTheme = {
  name: 'Pastel Colors',
  primary: '#9b7ebd',
  primaryDark: '#7f55b1',
  primaryDeep: '#5a3a7a',
  background: '#ffe1e0',
  surface: '#faf5ff',
  surfaceAlt: '#f7f4fc',
  surfaceRaised: '#f3e8ff',
  textPrimary: '#3a1f5a',
  textSecondary: '#6b4c8a',
  textMuted: '#b89fd4',
  textOnPrimary: '#ffffff',
  textOnPlayer: '#f5f2f2',
  hover: '#ede5f8',
  hoverActive: '#e8d8f5',
  active: '#e4d4f7',
  border: '#e5d8f5',
  borderLight: '#d4b8f0',
  accent: '#f49bab',
  accentBg: '#f49bab33',
  accentBgHover: '#f49bab55',
  accentHover: '#f7cdd4',
  mutedAccent: '#c0a0d8',
  cardBackground: '#ffffff',
  cardShadow: 'rgba(90, 58, 122, 0.1)',
  cardShadowHover: 'rgba(90, 58, 122, 0.2)',
  success: '#2e7d32',
  warning: '#F2C94C',
  error: '#c0392b',
  playerBar: '#9b7ebd',
};

export const midnightTheme: AppTheme = {
  name: 'Midnight',
  primary: '#3F3BD1',
  primaryDark: '#2F2CC3',
  primaryDeep: '#2320A0',
  background: '#13151c',
  surface: '#1a1c27',
  surfaceAlt: '#1a1c27',
  surfaceRaised: '#1a1c27',
  textPrimary: '#f3f2f7',
  textSecondary: '#a7a9b8',
  textMuted: '#858997',
  textOnPrimary: '#f3f2f7',
  textOnPlayer: '#f3f2f7',
  hover: '#1F2330',
  hoverActive: '#2b2a47',
  active: '#2b2a47',
  border: '#2b2d3a',
  borderLight: '#414453',
  accent: '#AEB3FF',
  accentBg: 'rgba(174, 179, 255, 0.12)',
  accentBgHover: 'rgba(174, 179, 255, 0.22)',
  accentHover: 'rgba(174, 179, 255, 0.07)',
  mutedAccent: '#4A4E6E',
  cardBackground: '#1a1c27',
  cardShadow: 'rgba(0, 0, 0, 0.25)',
  cardShadowHover: 'rgba(0, 0, 0, 0.45)',
  success: '#4CAF50',
  warning: '#F2C94C',
  error: '#EB5757',
  playerBar: '#1a1c27',
};

// Deep purple base with an electric lime-green accent — like a humming
// reactor core. Palette: #3f6d4e, #8bd450, #1d1a2f, #965fd4, #734f9a.
export const reactorTheme: AppTheme = {
  name: 'Reactor',
  primary: '#965fd4',
  primaryDark: '#734f9a',
  primaryDeep: '#5b3d7d',
  background: '#1d1a2f',
  surface: '#262338',
  surfaceAlt: '#2c2944',
  surfaceRaised: '#2c2944',
  textPrimary: '#ffffff',
  textSecondary: '#cdc2e6',
  textMuted: '#8a7fae',
  textOnPrimary: '#ffffff',
  textOnPlayer: '#ffffff',
  hover: '#262338',
  hoverActive: '#332e4f',
  active: '#3a3556',
  border: '#3a3556',
  borderLight: '#4a4373',
  accent: '#8bd450',
  accentBg: 'rgba(139, 212, 80, 0.14)',
  accentBgHover: 'rgba(139, 212, 80, 0.24)',
  accentHover: 'rgba(139, 212, 80, 0.08)',
  mutedAccent: '#3f6d4e',
  cardBackground: '#262338',
  cardShadow: 'rgba(0, 0, 0, 0.35)',
  cardShadowHover: 'rgba(0, 0, 0, 0.55)',
  success: '#8bd450',
  warning: '#F2C94C',
  error: '#EB5757',
  playerBar: '#1d1a2f',
};

// A warm sunset glow fading into a near-black starry sky, with pale cream text.
export const sunsetTheme: AppTheme = {
  name: 'Sunset',
  primary: '#d65a2a',
  primaryDark: '#a83d1f',
  primaryDeep: '#7a2a14',
  background: '#100c0e',
  surface: '#1a1417',
  surfaceAlt: '#231a1d',
  surfaceRaised: '#2b2024',
  textPrimary: '#f5e9d3',
  textSecondary: '#d6b88a',
  textMuted: '#8a7558',
  textOnPrimary: '#ffffff',
  textOnPlayer: '#f5e9d3',
  hover: '#1f1719',
  hoverActive: '#2b2024',
  active: '#36272b',
  border: '#2b2024',
  borderLight: '#3d2d31',
  accent: '#f0d4a3',
  accentBg: 'rgba(240, 212, 163, 0.12)',
  accentBgHover: 'rgba(240, 212, 163, 0.22)',
  accentHover: 'rgba(240, 212, 163, 0.07)',
  mutedAccent: '#8a7558',
  cardBackground: '#1a1417',
  cardShadow: 'rgba(0, 0, 0, 0.45)',
  cardShadowHover: 'rgba(214, 90, 42, 0.30)',
  success: '#7da95c',
  warning: '#e0a040',
  error: '#c14820',
  playerBar: '#0a0608',
};

// Lavender twilight with fiery red-orange embers and a glowing amber pop
// for warnings. Palette: #a78fcc, #5e4490, #d94a2c, #fcd450, #160f1d.
export const duskTheme: AppTheme = {
  name: 'Dusk',
  primary: '#a78fcc',
  primaryDark: '#8769b0',
  primaryDeep: '#5e4490',
  background: '#160f1d',
  surface: '#1f1828',
  surfaceAlt: '#28203a',
  surfaceRaised: '#322a44',
  textPrimary: '#f4ebd8',
  textSecondary: '#c9b9dc',
  textMuted: '#7e7393',
  textOnPrimary: '#ffffff',
  textOnPlayer: '#f4ebd8',
  hover: '#241c33',
  hoverActive: '#322a44',
  active: '#3d3450',
  border: '#322a44',
  borderLight: '#4a3f63',
  accent: '#d94a2c',
  accentBg: 'rgba(217, 74, 44, 0.14)',
  accentBgHover: 'rgba(217, 74, 44, 0.24)',
  accentHover: 'rgba(217, 74, 44, 0.08)',
  mutedAccent: '#7a3220',
  cardBackground: '#1f1828',
  cardShadow: 'rgba(0, 0, 0, 0.45)',
  cardShadowHover: 'rgba(217, 74, 44, 0.30)',
  success: '#7da95c',
  warning: '#fcd450',
  error: '#d94a2c',
  playerBar: '#160f1d',
};

// Electric lime-green lightning against a pitch-black void.
// Palette: #2dffa0, #5dff8f, #129158, #040805, #e8ffe8.
export const voltageTheme: AppTheme = {
  name: 'Voltage',
  primary: '#2dffa0',
  primaryDark: '#1ec77f',
  primaryDeep: '#129158',
  background: '#040805',
  surface: '#0c1410',
  surfaceAlt: '#121d17',
  surfaceRaised: '#1a2820',
  textPrimary: '#e8ffe8',
  textSecondary: '#9ec5a8',
  textMuted: '#5a7565',
  textOnPrimary: '#04130b',
  textOnPlayer: '#e8ffe8',
  hover: '#0f1a14',
  hoverActive: '#16261d',
  active: '#1d3326',
  border: '#1a2820',
  borderLight: '#2a4032',
  accent: '#5dff8f',
  accentBg: 'rgba(93, 255, 143, 0.14)',
  accentBgHover: 'rgba(93, 255, 143, 0.24)',
  accentHover: 'rgba(93, 255, 143, 0.08)',
  mutedAccent: '#2a6a45',
  cardBackground: '#0c1410',
  cardShadow: 'rgba(0, 0, 0, 0.55)',
  cardShadowHover: 'rgba(93, 255, 143, 0.30)',
  success: '#5dff8f',
  warning: '#f2c94c',
  error: '#ff4d4d',
  playerBar: '#040805',
};

export const themes: Record<string, AppTheme> = {
  Midnight: midnightTheme,
  Pastel: pastelTheme,
  Reactor: reactorTheme,
  Sunset: sunsetTheme,
  Dusk: duskTheme,
  Voltage: voltageTheme,
};

export const defaultTheme = midnightTheme;

export type ThemeColorOverrides = Pick<
  AppTheme,
  'primary' | 'accent' | 'background' | 'surface' | 'textPrimary' | 'textSecondary'
>;

const CUSTOM_THEMES_KEY = 'songbridge.customThemes';

export function createCustomTheme(name: string, base: AppTheme, colors: ThemeColorOverrides): AppTheme {
  const mix = (foreground: string, background: string, amount: number) => {
    const foregroundRgb = hexToRgb(foreground);
    const backgroundRgb = hexToRgb(background);
    if (!foregroundRgb || !backgroundRgb) return foreground;
    const values = foregroundRgb.map((value, index) =>
      Math.round(value * (1 - amount) + backgroundRgb[index] * amount),
    );
    return `#${values.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
  };
  const rgba = (color: string, alpha: number) => {
    const rgb = hexToRgb(color);
    return rgb ? `rgba(${rgb.join(', ')}, ${alpha})` : color;
  };

  return {
    ...base,
    name: name.trim(),
    ...colors,
    primaryDark: mix(colors.primary, '#000000', 0.2),
    primaryDeep: mix(colors.primary, '#000000', 0.4),
    surfaceAlt: mix(colors.surface, colors.textPrimary, 0.04),
    surfaceRaised: mix(colors.surface, colors.textPrimary, 0.09),
    textMuted: mix(colors.textSecondary, colors.background, 0.32),
    textOnPrimary: getContrastColor(colors.primary),
    textOnPlayer: colors.textPrimary,
    hover: mix(colors.surface, colors.textPrimary, 0.07),
    hoverActive: mix(colors.surface, colors.accent, 0.15),
    active: mix(colors.surface, colors.accent, 0.24),
    border: mix(colors.surface, colors.textPrimary, 0.12),
    borderLight: mix(colors.surface, colors.textPrimary, 0.2),
    accentBg: rgba(colors.accent, 0.14),
    accentBgHover: rgba(colors.accent, 0.24),
    accentHover: rgba(colors.accent, 0.08),
    mutedAccent: mix(colors.background, colors.accent, 0.45),
    cardBackground: colors.surface,
    cardShadow: 'rgba(0, 0, 0, 0.25)',
    cardShadowHover: rgba(colors.accent, 0.3),
    playerBar: base.playerBar === base.background ? colors.background : mix(base.playerBar, colors.background, 0.5),
  };
}

export function loadCustomThemes(): Record<string, AppTheme> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) ?? '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};

    return Object.fromEntries(
      Object.entries(stored).filter(([name, value]) => {
        if (themes[name] || !value || typeof value !== 'object' || Array.isArray(value)) return false;
        const theme = value as Record<string, unknown>;
        return theme.name === name && Object.values(theme).every((item) => typeof item === 'string');
      }),
    ) as Record<string, AppTheme>;
  } catch {
    return {};
  }
}

export function saveCustomThemes(customThemes: Record<string, AppTheme>) {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
  } catch {
    // Storage may be unavailable or full; keep the theme active for this session.
  }
}

function hexToRgb(color: string): [number, number, number] | null {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : null;
}

function getContrastColor(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return '#ffffff';
  const luminance = rgb.reduce((total, value) => {
    const normalized = value / 255;
    return total + (normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4);
  }, 0);
  return luminance / 3 > 0.45 ? '#15151a' : '#ffffff';
}
