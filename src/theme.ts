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
  background: '#0F1115',
  surface: '#1A1D24',
  surfaceAlt: '#232733',
  surfaceRaised: '#232733',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8BCC8',
  textMuted: '#7A8194',
  textOnPrimary: '#FFFFFF',
  textOnPlayer: '#FFFFFF',
  hover: '#1F2330',
  hoverActive: '#252836',
  active: '#2A2D3E',
  border: '#2A2D3A',
  borderLight: '#323645',
  accent: '#AEB3FF',
  accentBg: 'rgba(174, 179, 255, 0.12)',
  accentBgHover: 'rgba(174, 179, 255, 0.22)',
  accentHover: 'rgba(174, 179, 255, 0.07)',
  mutedAccent: '#4A4E6E',
  cardBackground: '#1A1D24',
  cardShadow: 'rgba(0, 0, 0, 0.25)',
  cardShadowHover: 'rgba(0, 0, 0, 0.45)',
  success: '#4CAF50',
  warning: '#F2C94C',
  error: '#EB5757',
  playerBar: '#1A1D24',
};

export const themes: Record<string, AppTheme> = {
  Midnight: midnightTheme,
  'Pastel Colors': pastelTheme,
};

export const defaultTheme = midnightTheme;
