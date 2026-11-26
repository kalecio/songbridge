import type { TranslationKey } from '../../i18n/types';

export const visualizerTypes = ['spectrum', 'wave', 'radial', 'tunnel'] as const;
export type VisualizerType = (typeof visualizerTypes)[number];
export type VisualizerColors = [string, string, string];

export interface VisualizerPalette {
  id: string;
  name: string;
  colors: VisualizerColors;
  builtIn?: boolean;
}

export interface VisualizerConfig {
  /** Legacy selector retained for restoring settings created before Butterchurn. */
  selectedVisualizer: VisualizerType;
  selectedPresetName?: string;
  favoritePresets: string[];
  randomEnabled: boolean;
  randomIntervalSeconds: number;
  randomFavoritesOnly: boolean;
  selectedPaletteIds: Record<string, string>;
  palettesByVisualizer: Record<string, VisualizerPalette[]>;
}

const STORAGE_KEY = 'songbridge.visualizer-settings';

export const visualizerLabels: Record<VisualizerType, TranslationKey> = {
  spectrum: 'visualizer.spectrum',
  wave: 'visualizer.wave',
  radial: 'visualizer.radial',
  tunnel: 'visualizer.tunnel',
} as const;

export const builtInPaletteLabelKeys: Record<string, TranslationKey> = {
  'builtin-neon': 'visualizer.paletteNeon',
  'builtin-ocean': 'visualizer.paletteOcean',
  'builtin-sunset': 'visualizer.paletteSunset',
};

const makeBuiltInPalettes = (): VisualizerPalette[] => [
  { id: 'builtin-neon', name: 'Neon', colors: ['#aeb3ff', '#683bff', '#59f0d0'], builtIn: true },
  { id: 'builtin-ocean', name: 'Ocean', colors: ['#6be7ff', '#3477ff', '#6bffd2'], builtIn: true },
  { id: 'builtin-sunset', name: 'Sunset', colors: ['#ffcc70', '#ff607d', '#9a65ff'], builtIn: true },
];

const makeDefaults = (): VisualizerConfig => ({
  selectedVisualizer: 'spectrum',
  randomEnabled: false,
  randomIntervalSeconds: 30,
  randomFavoritesOnly: false,
  favoritePresets: [],
  selectedPaletteIds: {
    spectrum: 'builtin-neon',
    wave: 'builtin-ocean',
    radial: 'builtin-sunset',
    tunnel: 'builtin-neon',
  },
  palettesByVisualizer: {
    spectrum: makeBuiltInPalettes(),
    wave: makeBuiltInPalettes(),
    radial: makeBuiltInPalettes(),
    tunnel: makeBuiltInPalettes(),
  },
});

const isVisualizerType = (value: unknown): value is VisualizerType =>
  typeof value === 'string' && (visualizerTypes as readonly string[]).includes(value);

const validPalette = (value: unknown): value is VisualizerPalette => {
  if (!value || typeof value !== 'object') return false;
  const palette = value as VisualizerPalette;
  return (
    typeof palette.id === 'string' &&
    typeof palette.name === 'string' &&
    Array.isArray(palette.colors) &&
    palette.colors.length === 3 &&
    palette.colors.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
  );
};

export const getDefaultVisualizerConfig = (): VisualizerConfig => makeDefaults();

export const loadVisualizerConfig = (): VisualizerConfig => {
  const defaults = makeDefaults();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<VisualizerConfig> | null;
    if (!parsed) return defaults;

    for (const type of visualizerTypes) {
      const storedPalettes = parsed.palettesByVisualizer?.[type];
      if (Array.isArray(storedPalettes)) {
        const builtIns = defaults.palettesByVisualizer[type];
        const customs = storedPalettes.filter(validPalette).filter((palette) => !palette.builtIn);
        defaults.palettesByVisualizer[type] = [...builtIns, ...customs];
      }
      const selectedId = parsed.selectedPaletteIds?.[type];
      if (
        typeof selectedId === 'string' &&
        defaults.palettesByVisualizer[type].some((palette) => palette.id === selectedId)
      ) {
        defaults.selectedPaletteIds[type] = selectedId;
      }
    }

    if (isVisualizerType(parsed.selectedVisualizer)) defaults.selectedVisualizer = parsed.selectedVisualizer;
    if (typeof parsed.selectedPresetName === 'string') defaults.selectedPresetName = parsed.selectedPresetName;
    if (Array.isArray(parsed.favoritePresets)) {
      defaults.favoritePresets = parsed.favoritePresets.filter((preset): preset is string => typeof preset === 'string');
    }
    if (typeof parsed.randomEnabled === 'boolean') defaults.randomEnabled = parsed.randomEnabled;
    if (typeof parsed.randomIntervalSeconds === 'number' && Number.isFinite(parsed.randomIntervalSeconds)) {
      defaults.randomIntervalSeconds = Math.max(5, Math.min(600, Math.round(parsed.randomIntervalSeconds)));
    }
    if (typeof parsed.randomFavoritesOnly === 'boolean') defaults.randomFavoritesOnly = parsed.randomFavoritesOnly;
    for (const [selector, storedPalettes] of Object.entries(parsed.palettesByVisualizer ?? {})) {
      if (!Array.isArray(storedPalettes)) continue;
      const customs = storedPalettes.filter(validPalette).filter((palette) => !palette.builtIn);
      if (customs.length) defaults.palettesByVisualizer[selector] = [...makeBuiltInPalettes(), ...customs];
      const selectedId = parsed.selectedPaletteIds?.[selector];
      if (typeof selectedId === 'string' && defaults.palettesByVisualizer[selector]?.some((palette) => palette.id === selectedId)) {
        defaults.selectedPaletteIds[selector] = selectedId;
      }
    }
    return defaults;
  } catch {
    return defaults;
  }
};

export const saveVisualizerConfig = (config: VisualizerConfig) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // The current session can still use the selection when local storage is unavailable.
  }
};

export const getSelectedPalette = (config: VisualizerConfig, type: string): VisualizerPalette =>
  config.palettesByVisualizer[type]?.find((palette) => palette.id === config.selectedPaletteIds[type]) ??
  config.palettesByVisualizer[type]?.[0] ??
  config.palettesByVisualizer.spectrum[0];

