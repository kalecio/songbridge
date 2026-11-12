import LastfmSettings from '../../Components/Lastfm/LastfmSettings';
import { useContext, useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import Page from '../../Components/Page/Page';
import PageHeader from '../../Components/PageHeader/PageHeader';
import { AppTheme, createCustomTheme, defaultTheme, ThemeColorOverrides, themes } from '../../theme';
import LyricsFontControl from '../../Components/LyricsFontControl/LyricsFontControl';
import VisualizerAppearance from './VisualizerAppearance';
import { useLyricsFontSize } from '../../hooks/useLyricsFontSize';
import { DEFAULT_SHORTCUTS, ShortcutAction, eventToBinding, formatBinding } from '../../keyboard';
import { Locale, TranslationKey } from '../../i18n/types';
import { useI18n } from '../../i18n/I18nProvider';
import {
  AddButton,
  ButtonRow,
  CancelThemeButton,
  CreateThemeButton,
  CreateThemeActions,
  DeleteThemeButton,
  CreateThemeHeader,
  CreateThemePanel,
  EmptyNote,
  FolderPlusIcon,
  PathItem,
  PathList,
  PathText,
  RemoveButton,
  RescanButton,
  RescanIcon,
  ResetShortcutsButton,
  ScanningBadge,
  Section,
  SectionTitle,
  SettingsContainer,
  SettingsToolbar,
  SettingsPanel,
  SearchWrap,
  SearchIcon,
  SearchInput,
  TabList,
  TabButton,
  SearchResults,
  SearchResultButton,
  SearchEmpty,
  ShortcutKey,
  ShortcutLabel,
  ShortcutList,
  ShortcutRow,
  SuccessBadge,
  ThemeLabel,
  ThemeColorField,
  ThemeColorGrid,
  ThemeColorInput,
  ThemeNameError,
  ThemeNameInput,
  ThemeRow,
  ThemeSelect,
  ThemeSourceField,
  ThemeTextField,
  TrashIcon,
  LyricsPreviewText,
} from './styles';

const themeColorFields: { key: keyof ThemeColorOverrides; label: TranslationKey }[] = [
  { key: 'primary', label: 'theme.primary' },
  { key: 'accent', label: 'theme.accent' },
  { key: 'background', label: 'theme.background' },
  { key: 'surface', label: 'theme.surface' },
  { key: 'textPrimary', label: 'theme.text' },
  { key: 'textSecondary', label: 'theme.secondaryText' },
];

const shortcutTranslationKeys: Record<ShortcutAction, TranslationKey> = {
  playPause: 'shortcut.playPause',
  next: 'shortcut.next',
  previous: 'shortcut.previous',
  shuffle: 'shortcut.shuffle',
  repeat: 'shortcut.repeat',
  mute: 'shortcut.mute',
  openFiles: 'shortcut.openFiles',
  search: 'shortcut.search',
};

const getThemeColorDraft = (theme: AppTheme): ThemeColorOverrides => ({
  primary: theme.primary,
  accent: theme.accent,
  background: theme.background,
  surface: theme.surface,
  textPrimary: theme.textPrimary,
  textSecondary: theme.textSecondary,
});

const Settings = () => {
  const { t, locale, setLocale } = useI18n();
  const {
    libraryPaths,
    setLibraryPaths,
    scanLibrary,
    isScanning,
    currentTheme,
    customThemes = {},
    setCurrentTheme,
    setCustomThemes,
    shortcuts,
    setShortcuts,
  } = useContext(AppContext);
  const { fontSize } = useLyricsFontSize();
  const [scanSuccess, setScanSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('appearance');
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const settingsTabs = [
    { id: 'appearance', label: t('settings.appearance') },
    { id: 'shortcuts', label: t('settings.keyboardShortcuts') },
    { id: 'library', label: t('settings.musicLibraryPaths') },
    { id: 'lastfm', label: t('settings.categoryAccount') },
  ];
  const searchItems = [
    {
      id: 'settings-lastfm',
      tab: 'lastfm',
      label: 'Last.fm',
      terms: 'last fm scrobbling conta autenticação conectar metadata metadados',
    },
    {
      id: 'settings-language',
      tab: 'appearance',
      label: t('settings.language'),
      terms: 'language idioma idioma lenguaje locale tradução translation',
    },
    {
      id: 'settings-theme',
      tab: 'appearance',
      label: t('settings.theme'),
      terms: 'theme tema themes temas color cor cores personalizado custom',
    },
    {
      id: 'settings-lyrics',
      tab: 'appearance',
      label: t('settings.lyricsFontSize'),
      terms: 'lyrics letra letras font fonte tamanho size text texto',
    },
    {
      id: 'settings-shortcuts',
      tab: 'shortcuts',
      label: t('settings.keyboardShortcuts'),
      terms: 'keyboard teclado atalho atalhos shortcut shortcuts hotkey',
    },
    {
      id: 'settings-library',
      tab: 'library',
      label: t('settings.musicLibraryPaths'),
      terms: 'music música musica library biblioteca pasta pastas folder folders scan analisar rescan',
    },
  ];
  const matchingItems = normalizedQuery
    ? searchItems.filter((item) => {
        const searchableText = `${item.label} ${item.terms}`.toLocaleLowerCase();
        return normalizedQuery.split(/\s+/).every((term) => searchableText.includes(term));
      })
    : [];
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const themeCatalog = { ...themes, ...customThemes };
  const [creatingTheme, setCreatingTheme] = useState(false);
  const [renamingTheme, setRenamingTheme] = useState(false);
  const [renamedTheme, setRenamedTheme] = useState('');
  const [themeName, setThemeName] = useState('');
  const [baseThemeName, setBaseThemeName] = useState(currentTheme);
  const [themeColors, setThemeColors] = useState<ThemeColorOverrides>(() =>
    getThemeColorDraft(themeCatalog[currentTheme] ?? defaultTheme),
  );
  const themeNameCandidate = renamingTheme ? renamedTheme : themeName;
  const duplicateThemeName = Object.keys(themeCatalog).some(
    (name) =>
      name.toLocaleLowerCase() === themeNameCandidate.trim().toLocaleLowerCase() &&
      !(renamingTheme && name === currentTheme),
  );
  const isCustomTheme = Boolean(customThemes[currentTheme]);

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setRecording(null);
        return;
      }
      const binding = eventToBinding(e);
      if (!binding) return; // bare modifier press
      e.preventDefault();
      setShortcuts?.({ ...shortcuts, [recording]: binding });
      setRecording(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [recording, shortcuts, setShortcuts]);

  const showSuccess = () => {
    setScanSuccess(true);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setScanSuccess(false), 3000);
  };

  const handleAddFolder = async () => {
    const folder = await open({ directory: true, multiple: false });
    if (!folder || libraryPaths.includes(folder)) return;

    await invoke('db_add_library_path', { path: folder });
    const updated = [...libraryPaths, folder];
    setLibraryPaths?.(updated);
    await scanLibrary?.(updated);
    showSuccess();
  };

  const handleRemove = async (path: string) => {
    await invoke('db_remove_library_path', { path });
    const updated = libraryPaths.filter((p) => p !== path);
    setLibraryPaths?.(updated);
    await scanLibrary?.(updated);
    showSuccess();
  };

  const handleRescan = async () => {
    await scanLibrary?.(libraryPaths);
    showSuccess();
  };

  const startCreatingTheme = () => {
    const base = themeCatalog[currentTheme] ?? defaultTheme;
    setThemeName(`${currentTheme} Custom`);
    setBaseThemeName(currentTheme);
    setThemeColors(getThemeColorDraft(base));
    setRenamingTheme(false);
    setCreatingTheme(true);
  };

  const startRenamingTheme = () => {
    if (!isCustomTheme) return;
    setRenamedTheme(currentTheme);
    setCreatingTheme(false);
    setRenamingTheme(true);
  };

  const handleCreateTheme = () => {
    const trimmedName = themeName.trim();
    const base = themeCatalog[baseThemeName] ?? defaultTheme;
    if (!trimmedName || duplicateThemeName || !setCustomThemes) return;
    const customTheme = createCustomTheme(trimmedName, base, themeColors);
    setCustomThemes((previous) => ({ ...previous, [trimmedName]: customTheme }));
    setCurrentTheme?.(trimmedName);
    setCreatingTheme(false);
  };

  const handleRenameTheme = () => {
    const nextName = renamedTheme.trim();
    if (!isCustomTheme || !nextName || duplicateThemeName || !setCustomThemes) return;
    setCustomThemes((previous) => {
      const next = { ...previous };
      const theme = next[currentTheme];
      if (!theme) return previous;
      delete next[currentTheme];
      next[nextName] = { ...theme, name: nextName };
      return next;
    });
    setCurrentTheme?.(nextName);
    setRenamingTheme(false);
  };

  const handleDeleteTheme = () => {
    if (!isCustomTheme || !setCustomThemes || !window.confirm(t('theme.confirmDelete', { name: currentTheme }))) {
      return;
    }
    setCustomThemes((previous) => {
      const next = { ...previous };
      delete next[currentTheme];
      return next;
    });
    setCurrentTheme?.(defaultTheme.name);
  };

  return (
    <Page>
      <PageHeader>{t('settings.title')}</PageHeader>
      <SettingsContainer>
        <SettingsToolbar>
          <SearchWrap>
            <SearchIcon aria-hidden="true" />
            <SearchInput
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('settings.searchPlaceholder')}
              aria-label={t('settings.searchPlaceholder')}
            />
          </SearchWrap>
          <TabList role="tablist" aria-label={t('settings.title')}>
            {settingsTabs.map((tab) => (
              <TabButton
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                $active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </TabButton>
            ))}
          </TabList>
          {normalizedQuery && (
            <SearchResults aria-live="polite">
              {matchingItems.length ? (
                matchingItems.map((item) => (
                  <SearchResultButton
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.tab);
                      window.requestAnimationFrame(() =>
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
                      );
                    }}
                  >
                    <span>{item.label}</span>
                    <small>{settingsTabs.find((tab) => tab.id === item.tab)?.label}</small>
                  </SearchResultButton>
                ))
              ) : (
                <SearchEmpty>{t('settings.noSearchResults')}</SearchEmpty>
              )}
            </SearchResults>
          )}
        </SettingsToolbar>

        {activeTab === 'lastfm' && (
          <SettingsPanel id="panel-lastfm" role="tabpanel" aria-labelledby="tab-lastfm">
            <Section id="settings-lastfm">
              <SectionTitle>Last.fm</SectionTitle>
              <LastfmSettings />
            </Section>
          </SettingsPanel>
        )}
        {activeTab === 'appearance' && (
          <SettingsPanel id="panel-appearance" role="tabpanel" aria-labelledby="tab-appearance">
            <Section>
              <div id="settings-language">
                <SectionTitle>{t('settings.appearance')}</SectionTitle>
                <ThemeRow>
                  <ThemeLabel htmlFor="locale-select">{t('settings.language')}</ThemeLabel>
                  <ThemeSelect
                    id="locale-select"
                    value={locale}
                    onChange={(event) => setLocale(event.target.value as Locale)}
                  >
                    {(['en-US', 'es-ES', 'pt-BR'] as const).map((code) => (
                      <option key={code} value={code}>
                        {t(code === 'en-US' ? 'locale.enUS' : code === 'es-ES' ? 'locale.esES' : 'locale.ptBR')}
                      </option>
                    ))}
                  </ThemeSelect>
                </ThemeRow>
              </div>
              <div id="settings-theme">
                <ThemeRow>
                  <ThemeLabel htmlFor="theme-select">{t('settings.theme')}</ThemeLabel>
                  <ThemeSelect
                    id="theme-select"
                    value={currentTheme}
                    onChange={(e) => {
                      setRenamingTheme(false);
                      setCurrentTheme?.(e.target.value);
                    }}
                  >
                    {Object.keys(themeCatalog).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </ThemeSelect>
                  <CreateThemeButton type="button" onClick={startCreatingTheme}>
                    {t('theme.create')}
                  </CreateThemeButton>
                  {isCustomTheme && (
                    <>
                      <CancelThemeButton type="button" onClick={startRenamingTheme}>
                        {t('theme.rename')}
                      </CancelThemeButton>
                      <DeleteThemeButton type="button" onClick={handleDeleteTheme}>
                        {t('theme.delete')}
                      </DeleteThemeButton>
                    </>
                  )}
                </ThemeRow>
                {renamingTheme && isCustomTheme && (
                  <CreateThemePanel aria-label={t('theme.renameTitle')}>
                    <CreateThemeHeader>{t('theme.renameTitle')}</CreateThemeHeader>
                    <ThemeTextField>
                      <span>{t('theme.name')}</span>
                      <ThemeNameInput
                        autoComplete="off"
                        maxLength={40}
                        value={renamedTheme}
                        onChange={(event) => setRenamedTheme(event.target.value)}
                        placeholder={t('theme.namePlaceholder')}
                      />
                    </ThemeTextField>
                    {duplicateThemeName && renamedTheme.trim() && (
                      <ThemeNameError role="alert">{t('theme.duplicateName')}</ThemeNameError>
                    )}
                    <CreateThemeActions>
                      <CancelThemeButton type="button" onClick={() => setRenamingTheme(false)}>
                        {t('common.cancel')}
                      </CancelThemeButton>
                      <CreateThemeButton
                        type="button"
                        onClick={handleRenameTheme}
                        disabled={!renamedTheme.trim() || duplicateThemeName || !setCustomThemes}
                      >
                        {t('theme.updateName')}
                      </CreateThemeButton>
                    </CreateThemeActions>
                  </CreateThemePanel>
                )}
                {creatingTheme && (
                  <CreateThemePanel aria-label={t('theme.cloneCustomize')}>
                    <CreateThemeHeader>{t('theme.cloneCustomize')}</CreateThemeHeader>
                    <ThemeRow>
                      <ThemeTextField>
                        <span>{t('theme.name')}</span>
                        <ThemeNameInput
                          autoComplete="off"
                          maxLength={40}
                          value={themeName}
                          onChange={(event) => setThemeName(event.target.value)}
                          placeholder={t('theme.namePlaceholder')}
                        />
                      </ThemeTextField>
                      <ThemeSourceField>
                        <span>{t('theme.cloneFrom')}</span>
                        <ThemeSelect
                          aria-label={t('theme.cloneFrom')}
                          value={baseThemeName}
                          onChange={(event) => {
                            const name = event.target.value;
                            setBaseThemeName(name);
                            setThemeColors(getThemeColorDraft(themeCatalog[name] ?? defaultTheme));
                          }}
                        >
                          {Object.keys(themeCatalog).map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </ThemeSelect>
                      </ThemeSourceField>
                    </ThemeRow>
                    {duplicateThemeName && themeName.trim() && (
                      <ThemeNameError role="alert">{t('theme.duplicateName')}</ThemeNameError>
                    )}
                    <ThemeColorGrid>
                      {themeColorFields.map(({ key, label }) => (
                        <ThemeColorField key={key}>
                          <span>{t(label)}</span>
                          <ThemeColorInput
                            aria-label={t(label)}
                            type="color"
                            value={themeColors[key]}
                            onChange={(event) =>
                              setThemeColors((previous) => ({ ...previous, [key]: event.target.value }))
                            }
                          />
                        </ThemeColorField>
                      ))}
                    </ThemeColorGrid>
                    <CreateThemeActions>
                      <CancelThemeButton type="button" onClick={() => setCreatingTheme(false)}>
                        {t('common.cancel')}
                      </CancelThemeButton>
                      <CreateThemeButton
                        type="button"
                        onClick={handleCreateTheme}
                        disabled={!themeName.trim() || duplicateThemeName || !setCustomThemes}
                      >
                        {t('theme.save')}
                      </CreateThemeButton>
                    </CreateThemeActions>
                  </CreateThemePanel>
                )}
              </div>
              <Section id="settings-lyrics">
                <SectionTitle>{t('common.lyrics')}</SectionTitle>
                <LyricsFontControl />
                <LyricsPreviewText style={{ fontSize }}>{t('album.welcomeTitle')}</LyricsPreviewText>
              </Section>
              <VisualizerAppearance />
            </Section>
          </SettingsPanel>
        )}

        {activeTab === 'shortcuts' && (
          <SettingsPanel id="panel-shortcuts" role="tabpanel" aria-labelledby="tab-shortcuts">
            <Section id="settings-shortcuts">
              <SectionTitle>{t('settings.keyboardShortcuts')}</SectionTitle>
              <ShortcutList>
                {(Object.keys(shortcutTranslationKeys) as ShortcutAction[]).map((action) => (
                  <ShortcutRow key={action}>
                    <ShortcutLabel>{t(shortcutTranslationKeys[action])}</ShortcutLabel>
                    <ShortcutKey
                      aria-label={t('settings.editShortcut', { action: t(shortcutTranslationKeys[action]) })}
                      $recording={recording === action}
                      onClick={() => setRecording(action)}
                    >
                      {recording === action
                        ? t('settings.pressAKey')
                        : formatBinding(shortcuts[action]) || t('settings.unset')}
                    </ShortcutKey>
                  </ShortcutRow>
                ))}
              </ShortcutList>
              <ResetShortcutsButton onClick={() => setShortcuts?.(DEFAULT_SHORTCUTS)}>
                {t('settings.resetShortcuts')}
              </ResetShortcutsButton>
            </Section>
          </SettingsPanel>
        )}

        {activeTab === 'library' && (
          <SettingsPanel id="panel-library" role="tabpanel" aria-labelledby="tab-library">
            <Section id="settings-library">
              <SectionTitle>{t('settings.musicLibraryPaths')}</SectionTitle>

              {libraryPaths.length === 0 ? (
                <EmptyNote>{t('settings.noFolders')}</EmptyNote>
              ) : (
                <PathList>
                  {libraryPaths.map((path) => (
                    <PathItem key={path}>
                      <PathText title={path}>{path}</PathText>
                      <RemoveButton aria-label={t('settings.removePath', { path })} onClick={() => handleRemove(path)}>
                        <TrashIcon />
                      </RemoveButton>
                    </PathItem>
                  ))}
                </PathList>
              )}

              <ButtonRow>
                <AddButton onClick={handleAddFolder} disabled={isScanning}>
                  <FolderPlusIcon />
                  {t('settings.addFolder')}
                </AddButton>
                <RescanButton onClick={handleRescan} disabled={isScanning || libraryPaths.length === 0}>
                  <RescanIcon $spinning={isScanning} />
                  {t('settings.rescanLibrary')}
                </RescanButton>
                {isScanning && <ScanningBadge>{t('settings.scanning')}</ScanningBadge>}
                {!isScanning && scanSuccess && <SuccessBadge>{t('settings.scanComplete')}</SuccessBadge>}
              </ButtonRow>
            </Section>
          </SettingsPanel>
        )}
      </SettingsContainer>
    </Page>
  );
};

export default Settings;
