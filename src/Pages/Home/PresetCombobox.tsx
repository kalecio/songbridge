import { useMemo, useState } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa6';
import { useI18n } from '../../i18n/I18nProvider';
import { getPresetDisplayName } from './butterchurnPresets';
import { PresetComboboxFrame, PresetFavoriteButton, PresetInput, PresetList, PresetOption, PresetOptionRow, PresetSectionLabel } from './styles';

interface PresetComboboxProps {
  presets: string[];
  selected: string;
  favorites: string[];
  onSelect: (..._args: [string]) => void;
  onToggleFavorite: (..._args: [string]) => void;
  id?: string;
}

const PresetCombobox = ({ presets, selected, favorites, onSelect, onToggleFavorite, id = 'home-visualizer-preset' }: PresetComboboxProps) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => presets.filter((preset) =>
    `${getPresetDisplayName(preset)} ${preset}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  ), [presets, query]);
  const favoriteItems = filtered.filter((preset) => favorites.includes(preset));
  const otherItems = filtered.filter((preset) => !favorites.includes(preset));
  const orderedItems = [...favoriteItems, ...otherItems];
  const listId = 'butterchurn-preset-options';
  const selectedLabel = selected ? getPresetDisplayName(selected) : '';

  const choose = (preset: string) => {
    onSelect(preset);
    setQuery('');
    setOpen(false);
  };

  return (
    <PresetComboboxFrame onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setOpen(false);
        setQuery('');
      }
    }}>
      <PresetInput
        id={id}
        role="combobox"
        aria-label={t('visualizer.preset')}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && orderedItems[activeIndex] ? `preset-option-${activeIndex}` : undefined}
        value={open ? query : selectedLabel}
        placeholder={t('home.searchPresets')}
        disabled={!presets.length}
        onFocus={() => { setQuery(''); setOpen(true); setActiveIndex(0); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, orderedItems.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && open && orderedItems[activeIndex]) {
            event.preventDefault();
            choose(orderedItems[activeIndex]);
          } else if (event.key === 'Escape') {
            setOpen(false);
            setQuery('');
          }
        }}
      />
      {open && (
        <PresetList id={listId} role="listbox" aria-label={t('visualizer.preset')}>
          {!orderedItems.length ? (
            <PresetSectionLabel>{t('home.noPresetsFound')}</PresetSectionLabel>
          ) : (
            <>
              {favoriteItems.length > 0 && <PresetSectionLabel>{t('visualizer.favorites')}</PresetSectionLabel>}
              {favoriteItems.map((preset) => {
                const index = orderedItems.indexOf(preset);
                return <PresetRow key={preset} preset={preset} index={index} selected={selected === preset} favorite favoritesLabel={t('visualizer.unfavoritePreset')} onChoose={choose} onToggleFavorite={onToggleFavorite} />;
              })}
              {otherItems.length > 0 && favoriteItems.length > 0 && <PresetSectionLabel>{t('visualizer.allPresets')}</PresetSectionLabel>}
              {otherItems.map((preset) => {
                const index = orderedItems.indexOf(preset);
                return <PresetRow key={preset} preset={preset} index={index} selected={selected === preset} favorite={false} favoritesLabel={t('visualizer.favoritePreset')} onChoose={choose} onToggleFavorite={onToggleFavorite} />;
              })}
            </>
          )}
        </PresetList>
      )}
    </PresetComboboxFrame>
  );
};

interface PresetRowProps {
  preset: string;
  index: number;
  selected: boolean;
  favorite: boolean;
  favoritesLabel: string;
  onChoose: (..._args: [string]) => void;
  onToggleFavorite: (..._args: [string]) => void;
}

const PresetRow = ({ preset, index, selected, favorite, favoritesLabel, onChoose, onToggleFavorite }: PresetRowProps) => (
  <PresetOptionRow role="group">
    <PresetOption
      id={`preset-option-${index}`}
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onChoose(preset)}
    >
      {getPresetDisplayName(preset)}
    </PresetOption>
    <PresetFavoriteButton
      type="button"
      aria-label={favoritesLabel}
      title={favoritesLabel}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onToggleFavorite(preset)}
    >
      {favorite ? <FaStar aria-hidden="true" /> : <FaRegStar aria-hidden="true" />}
    </PresetFavoriteButton>
  </PresetOptionRow>
);

export default PresetCombobox;
