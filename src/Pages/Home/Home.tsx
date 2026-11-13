import { useContext, useEffect, useMemo, useState } from 'react';
import { FaCompactDisc, FaWaveSquare } from 'react-icons/fa6';
import { AppContext } from '../../Context/AppContext';
import { useI18n } from '../../i18n/I18nProvider';
import { displayTitle } from '../../songDisplay';
import { useLazyAlbumArt } from '../../hooks/useLazyAlbumArt';
import Visualizer from './Visualizer';
import PresetCombobox from './PresetCombobox';
import { loadButterchurnPresets, type ButterchurnPresetCatalog } from './butterchurnPresets';
import {
  getSelectedPalette,
  loadVisualizerConfig,
  saveVisualizerConfig,
  type VisualizerConfig,
} from './visualizerSettings';
import {
  ArtworkFallback,
  ArtworkFrame,
  ArtworkStage,
  EmptyState,
  Experience,
  HomeHeading,
  HomePage,
  HomeTop,
  ModeButton,
  ModeSwitch,
  TrackInfo,
  VisualizerCaption,
  VisualizerStage,
} from './styles';

type HomeMode = 'cover' | 'visualizer';

const Home = () => {
  const { t } = useI18n();
  const { metadata, currentPath, isPlaying } = useContext(AppContext);
  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(loadVisualizerConfig);
  const [presetCatalog, setPresetCatalog] = useState<ButterchurnPresetCatalog>({});
  const [mode, setMode] = useState<HomeMode>(() =>
    window.localStorage.getItem('songbridge-home-mode') === 'visualizer' ? 'visualizer' : 'cover',
  );
  const artwork = useLazyAlbumArt(currentPath, metadata?.image);
  const hasTrack = Boolean(currentPath || metadata?.title || metadata?.album);
  const title = displayTitle({ title: metadata?.title, path: currentPath }, t('home.noTrackTitle'));
  const artist = metadata?.artist || t('home.unknownArtist');
  const album = metadata?.album || t('home.unknownAlbum');
  const presetNames = useMemo(() => Object.keys(presetCatalog).sort((first, second) => first.localeCompare(second)), [presetCatalog]);
  const selectedPresetName = visualizerConfig.selectedPresetName && presetCatalog[visualizerConfig.selectedPresetName]
    ? visualizerConfig.selectedPresetName
    : presetNames[0];
  const selectedPalette = getSelectedPalette(visualizerConfig, selectedPresetName ?? 'spectrum');

  useEffect(() => {
    if (mode !== 'visualizer') return;
    let cancelled = false;
    void loadButterchurnPresets().then((catalog) => {
      if (!cancelled) setPresetCatalog(catalog);
    }).catch((error) => console.error('Unable to load Butterchurn presets', error));
    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => {
    window.localStorage.setItem('songbridge-home-mode', mode);
  }, [mode]);

  const updateVisualizerConfig = (next: VisualizerConfig) => {
    setVisualizerConfig(next);
    saveVisualizerConfig(next);
  };

  const toggleFavoritePreset = (preset: string) => {
    const favoritePresets = visualizerConfig.favoritePresets.includes(preset)
      ? visualizerConfig.favoritePresets.filter((entry) => entry !== preset)
      : [...visualizerConfig.favoritePresets, preset];
    updateVisualizerConfig({ ...visualizerConfig, favoritePresets });
  };

  return (
    <HomePage>
      <HomeTop>
        <HomeHeading>
          <p>{t('home.eyebrow')}</p>
          <h1>{t('home.title')}</h1>
        </HomeHeading>
        <ModeSwitch role="group" aria-label={t('home.displayMode')}>
          <ModeButton
            type="button"
            $active={mode === 'cover'}
            aria-pressed={mode === 'cover'}
            onClick={() => setMode('cover')}
          >
            <FaCompactDisc aria-hidden="true" /> {t('home.coverArt')}
          </ModeButton>
          <ModeButton
            type="button"
            $active={mode === 'visualizer'}
            aria-pressed={mode === 'visualizer'}
            onClick={() => setMode('visualizer')}
          >
            <FaWaveSquare aria-hidden="true" /> {t('home.visualizers')}
          </ModeButton>
        </ModeSwitch>
        {mode === 'visualizer' && (
          <>
            <PresetCombobox
              presets={presetNames}
              selected={selectedPresetName ?? ''}
              favorites={visualizerConfig.favoritePresets}
              onSelect={(preset) => updateVisualizerConfig({
                ...visualizerConfig,
                selectedPresetName: preset,
                selectedPaletteIds: {
                  ...visualizerConfig.selectedPaletteIds,
                  [preset]: visualizerConfig.selectedPaletteIds[preset] ?? 'builtin-neon',
                },
              })}
              onToggleFavorite={toggleFavoritePreset}
            />
          </>
        )}
      </HomeTop>

      <Experience aria-label={mode === 'cover' ? t('home.coverArt') : t('home.visualizers')}>
        {!hasTrack ? (
          <EmptyState>
            <h2>{t('home.noTrackTitle')}</h2>
            <p>{t('home.noTrackDescription')}</p>
          </EmptyState>
        ) : mode === 'cover' ? (
          <ArtworkStage>
            <ArtworkFrame>
              {artwork ? <img src={artwork} alt={t('home.coverFor', { album })} /> : <ArtworkFallback>♫</ArtworkFallback>}
            </ArtworkFrame>
            <TrackInfo>
              <p className="eyebrow">{isPlaying ? t('home.nowPlaying') : t('home.lastPlayed')}</p>
              <h2>{title}</h2>
              <p className="artist">{artist}</p>
              <p className="album">{album}</p>
            </TrackInfo>
          </ArtworkStage>
        ) : (
          <>
            <VisualizerStage>
              <Visualizer
                isPlaying={isPlaying}
                presetName={selectedPresetName ?? ''}
                preset={selectedPresetName ? presetCatalog[selectedPresetName] : undefined}
                colors={selectedPalette.colors}
              />
            </VisualizerStage>
            <VisualizerCaption>
              <p className="eyebrow">{isPlaying ? t('home.nowPlaying') : t('home.visualizers')}</p>
              <strong>{title}</strong>
              <span>{artist} · {album}</span>
            </VisualizerCaption>
          </>
        )}
      </Experience>
    </HomePage>
  );
};

export default Home;
