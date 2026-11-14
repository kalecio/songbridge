import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import {
  builtInPaletteLabelKeys,
  getSelectedPalette,
  loadVisualizerConfig,
  saveVisualizerConfig,
  type VisualizerColors,
  type VisualizerConfig,
  type VisualizerPalette,
} from '../Home/visualizerSettings';
import { loadButterchurnPresets } from '../Home/butterchurnPresets';
import PresetCombobox from '../Home/PresetCombobox';
import {
  CreateThemeActions,
  CreateThemeButton,
  CreateThemeHeader,
  CreateThemePanel,
  CancelThemeButton,
  ThemeColorField,
  ThemeColorGrid,
  ThemeColorInput,
  ThemeLabel,
  ThemeNameError,
  ThemeNameInput,
  ThemeRow,
  ThemeSelect,
  ThemeTextField,
  VisualizerIntervalInput,
  VisualizerRandomToggle,
} from './styles';

const colorLabels = ['visualizer.colorPrimary', 'visualizer.colorSecondary', 'visualizer.colorTertiary'] as const;

const VisualizerAppearance = () => {
  const { t } = useI18n();
  const [config, setConfig] = useState<VisualizerConfig>(loadVisualizerConfig);
  const [randomIntervalDraft, setRandomIntervalDraft] = useState(String(config.randomIntervalSeconds));
  const [presetNames, setPresetNames] = useState<string[]>([]);
  const [visualizer, setVisualizer] = useState(config.selectedPresetName ?? '');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [colors, setColors] = useState<VisualizerColors>(getSelectedPalette(config, visualizer).colors);
  const selectedPalette = getSelectedPalette(config, visualizer);
  const duplicateName = (config.palettesByVisualizer[visualizer] ?? []).some(
    (palette) => palette.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
  );

  useEffect(() => {
    let cancelled = false;
    void loadButterchurnPresets()
      .then((presets) => {
        if (cancelled) return;
        const names = Object.keys(presets).sort((first, second) => first.localeCompare(second));
        setPresetNames(names);
        const latestConfig = loadVisualizerConfig();
        setRandomIntervalDraft(String(latestConfig.randomIntervalSeconds));
        const current =
          latestConfig.selectedPresetName && presets[latestConfig.selectedPresetName]
            ? latestConfig.selectedPresetName
            : (names[0] ?? '');
        if (current) {
          setVisualizer(current);
          const next = {
            ...latestConfig,
            selectedPresetName: current,
            selectedPaletteIds: {
              ...latestConfig.selectedPaletteIds,
              [current]: latestConfig.selectedPaletteIds[current] ?? 'builtin-neon',
            },
          };
          setConfig(next);
          saveVisualizerConfig(next);
        }
      })
      .catch((error) => console.error('Unable to load Butterchurn presets', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = (next: VisualizerConfig) => {
    setConfig(next);
    saveVisualizerConfig(next);
  };

  const selectVisualizer = (next: string) => {
    setVisualizer(next);
    setCreating(false);
    const palette = getSelectedPalette(config, next);
    setColors(palette.colors);
    persist({
      ...config,
      selectedPresetName: next,
      selectedPaletteIds: { ...config.selectedPaletteIds, [next]: config.selectedPaletteIds[next] ?? 'builtin-neon' },
    });
  };

  const selectPalette = (id: string) => {
    const palette = config.palettesByVisualizer[visualizer]?.find((entry) => entry.id === id);
    if (!palette) return;
    setColors(palette.colors);
    persist({
      ...config,
      selectedPresetName: visualizer,
      selectedPaletteIds: { ...config.selectedPaletteIds, [visualizer]: id },
    });
  };

  const toggleFavoritePreset = (preset: string) => {
    const favoritePresets = config.favoritePresets.includes(preset)
      ? config.favoritePresets.filter((entry) => entry !== preset)
      : [...config.favoritePresets, preset];
    persist({ ...config, favoritePresets });
  };

  const beginCreating = () => {
    setName('');
    setColors(selectedPalette.colors);
    setCreating(true);
  };

  const savePalette = () => {
    const trimmedName = name.trim();
    if (!trimmedName || duplicateName) return;
    const palette: VisualizerPalette = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      colors,
    };
    persist({
      ...config,
      selectedPresetName: visualizer,
      selectedPaletteIds: { ...config.selectedPaletteIds, [visualizer]: palette.id },
      palettesByVisualizer: {
        ...config.palettesByVisualizer,
        [visualizer]: [...(config.palettesByVisualizer[visualizer] ?? config.palettesByVisualizer.spectrum), palette],
      },
    });
    setCreating(false);
  };

  return (
    <CreateThemePanel aria-label={t('visualizer.appearanceTitle')}>
      <CreateThemeHeader>{t('visualizer.appearanceTitle')}</CreateThemeHeader>
      <p>{t('visualizer.appearanceDescription')}</p>
      <ThemeRow>
        <ThemeLabel htmlFor="visualizer-style-select">{t('visualizer.preset')}</ThemeLabel>
        <PresetCombobox
          id="visualizer-style-select"
          presets={presetNames}
          selected={visualizer}
          favorites={config.favoritePresets}
          onSelect={selectVisualizer}
          onToggleFavorite={toggleFavoritePreset}
        />
        <ThemeLabel htmlFor="visualizer-palette-select">{t('visualizer.colorTheme')}</ThemeLabel>
        <ThemeSelect
          id="visualizer-palette-select"
          value={config.selectedPaletteIds[visualizer]}
          onChange={(event) => selectPalette(event.target.value)}
        >
          {(config.palettesByVisualizer[visualizer] ?? config.palettesByVisualizer.spectrum).map((palette) => (
            <option key={palette.id} value={palette.id}>
              {palette.builtIn ? t(builtInPaletteLabelKeys[palette.id]) : palette.name}
            </option>
          ))}
        </ThemeSelect>
        <CreateThemeButton type="button" onClick={beginCreating}>
          {t('visualizer.createColorTheme')}
        </CreateThemeButton>
      </ThemeRow>
      <CreateThemeHeader>{t('visualizer.randomTitle')}</CreateThemeHeader>
      <ThemeRow>
        <VisualizerRandomToggle>
          <input
            type="checkbox"
            checked={config.randomEnabled}
            onChange={(event) => persist({ ...config, randomEnabled: event.target.checked })}
          />
          {t('visualizer.randomEnable')}
        </VisualizerRandomToggle>
        <ThemeTextField>
          {t('visualizer.randomInterval')}
          <VisualizerIntervalInput
            type="number"
            min={5}
            max={600}
            step={1}
            value={randomIntervalDraft}
            onChange={(event) => {
              const value = event.target.value;
              setRandomIntervalDraft(value);
              if (value === '') return;
              const seconds = Number(value);
              if (Number.isFinite(seconds) && seconds >= 5 && seconds <= 600) {
                persist({ ...config, randomIntervalSeconds: seconds });
              }
            }}
            onBlur={() => {
              const seconds = Number(randomIntervalDraft);
              if (!randomIntervalDraft || !Number.isFinite(seconds)) {
                setRandomIntervalDraft(String(config.randomIntervalSeconds));
                return;
              }
              const normalized = Math.max(5, Math.min(600, Math.round(seconds)));
              setRandomIntervalDraft(String(normalized));
              if (normalized !== config.randomIntervalSeconds) {
                persist({ ...config, randomIntervalSeconds: normalized });
              }
            }}
          />
        </ThemeTextField>
        <ThemeTextField>
          {t('visualizer.randomScope')}
          <ThemeSelect
            value={config.randomFavoritesOnly ? 'favorites' : 'all'}
            disabled={!config.randomEnabled}
            onChange={(event) => persist({ ...config, randomFavoritesOnly: event.target.value === 'favorites' })}
          >
            <option value="all">{t('visualizer.randomAll')}</option>
            <option value="favorites">{t('visualizer.randomFavorites')}</option>
          </ThemeSelect>
        </ThemeTextField>
      </ThemeRow>
      {config.randomEnabled && config.randomFavoritesOnly && config.favoritePresets.length < 2 && (
        <p>{t('visualizer.randomNeedsFavorites')}</p>
      )}
      {creating && (
        <div>
          <CreateThemeHeader>{t('visualizer.createColorThemeFor', { style: visualizer })}</CreateThemeHeader>
          <ThemeRow>
            <ThemeTextField>
              <span>{t('theme.name')}</span>
              <ThemeNameInput
                autoComplete="off"
                maxLength={40}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('visualizer.colorThemeName')}
              />
            </ThemeTextField>
          </ThemeRow>
          {duplicateName && name.trim() && (
            <ThemeNameError role="alert">{t('visualizer.paletteDuplicate')}</ThemeNameError>
          )}
          <ThemeColorGrid>
            {colors.map((color, index) => (
              <ThemeColorField key={`${colorLabels[index]}-${index}`}>
                <span>{t(colorLabels[index])}</span>
                <ThemeColorInput
                  aria-label={t(colorLabels[index])}
                  type="color"
                  value={color}
                  onChange={(event) =>
                    setColors(
                      (previous) =>
                        previous.map((value, colorIndex) =>
                          colorIndex === index ? event.target.value : value,
                        ) as VisualizerColors,
                    )
                  }
                />
              </ThemeColorField>
            ))}
          </ThemeColorGrid>
          <CreateThemeActions>
            <CancelThemeButton type="button" onClick={() => setCreating(false)}>
              {t('common.cancel')}
            </CancelThemeButton>
            <CreateThemeButton type="button" onClick={savePalette} disabled={!name.trim() || duplicateName}>
              {t('visualizer.saveColorTheme')}
            </CreateThemeButton>
          </CreateThemeActions>
        </div>
      )}
    </CreateThemePanel>
  );
};

export default VisualizerAppearance;
