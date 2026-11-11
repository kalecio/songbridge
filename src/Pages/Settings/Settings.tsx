import { useContext, useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import Page from '../../Components/Page/Page';
import PageHeader from '../../Components/PageHeader/PageHeader';
import { AppTheme, createCustomTheme, defaultTheme, ThemeColorOverrides, themes } from '../../theme';
import { DEFAULT_SHORTCUTS, SHORTCUT_LABELS, ShortcutAction, eventToBinding, formatBinding } from '../../keyboard';
import {
  AddButton,
  ButtonRow,
  CancelThemeButton,
  CreateThemeButton,
  CreateThemeActions,
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
} from './styles';

const themeColorFields: { key: keyof ThemeColorOverrides; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'textPrimary', label: 'Text' },
  { key: 'textSecondary', label: 'Secondary text' },
];

const getThemeColorDraft = (theme: AppTheme): ThemeColorOverrides => ({
  primary: theme.primary,
  accent: theme.accent,
  background: theme.background,
  surface: theme.surface,
  textPrimary: theme.textPrimary,
  textSecondary: theme.textSecondary,
});

const Settings = () => {
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
  const [scanSuccess, setScanSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const themeCatalog = { ...themes, ...customThemes };
  const [creatingTheme, setCreatingTheme] = useState(false);
  const [themeName, setThemeName] = useState('');
  const [baseThemeName, setBaseThemeName] = useState(currentTheme);
  const [themeColors, setThemeColors] = useState<ThemeColorOverrides>(() =>
    getThemeColorDraft(themeCatalog[currentTheme] ?? defaultTheme),
  );
  const duplicateThemeName = Object.keys(themeCatalog).some(
    (name) => name.toLocaleLowerCase() === themeName.trim().toLocaleLowerCase(),
  );

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
    setCreatingTheme(true);
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

  return (
    <Page>
      <PageHeader>Settings</PageHeader>
      <SettingsContainer>
        <Section>
          <SectionTitle>Appearance</SectionTitle>
          <ThemeRow>
            <ThemeLabel htmlFor="theme-select">Theme</ThemeLabel>
            <ThemeSelect id="theme-select" value={currentTheme} onChange={(e) => setCurrentTheme?.(e.target.value)}>
              {Object.keys(themeCatalog).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </ThemeSelect>
            <CreateThemeButton type="button" onClick={startCreatingTheme}>
              Create theme
            </CreateThemeButton>
          </ThemeRow>
          {creatingTheme && (
            <CreateThemePanel aria-label="Create a custom theme">
              <CreateThemeHeader>Clone and customize a theme</CreateThemeHeader>
              <ThemeRow>
                <ThemeTextField>
                  <span>Name</span>
                  <ThemeNameInput
                    autoComplete="off"
                    maxLength={40}
                    value={themeName}
                    onChange={(event) => setThemeName(event.target.value)}
                    placeholder="My theme"
                  />
                </ThemeTextField>
                <ThemeSourceField>
                  <span>Clone from</span>
                  <ThemeSelect
                    aria-label="Clone from theme"
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
                <ThemeNameError role="alert">A theme with this name already exists.</ThemeNameError>
              )}
              <ThemeColorGrid>
                {themeColorFields.map(({ key, label }) => (
                  <ThemeColorField key={key}>
                    <span>{label}</span>
                    <ThemeColorInput
                      aria-label={label}
                      type="color"
                      value={themeColors[key]}
                      onChange={(event) => setThemeColors((previous) => ({ ...previous, [key]: event.target.value }))}
                    />
                  </ThemeColorField>
                ))}
              </ThemeColorGrid>
              <CreateThemeActions>
                <CancelThemeButton type="button" onClick={() => setCreatingTheme(false)}>
                  Cancel
                </CancelThemeButton>
                <CreateThemeButton
                  type="button"
                  onClick={handleCreateTheme}
                  disabled={!themeName.trim() || duplicateThemeName || !setCustomThemes}
                >
                  Save theme
                </CreateThemeButton>
              </CreateThemeActions>
            </CreateThemePanel>
          )}
        </Section>

        <Section>
          <SectionTitle>Keyboard Shortcuts</SectionTitle>
          <ShortcutList>
            {(Object.keys(SHORTCUT_LABELS) as ShortcutAction[]).map((action) => (
              <ShortcutRow key={action}>
                <ShortcutLabel>{SHORTCUT_LABELS[action]}</ShortcutLabel>
                <ShortcutKey
                  aria-label={`Edit shortcut for ${SHORTCUT_LABELS[action]}`}
                  $recording={recording === action}
                  onClick={() => setRecording(action)}
                >
                  {recording === action ? 'Press a key…' : formatBinding(shortcuts[action]) || 'Unset'}
                </ShortcutKey>
              </ShortcutRow>
            ))}
          </ShortcutList>
          <ResetShortcutsButton onClick={() => setShortcuts?.(DEFAULT_SHORTCUTS)}>
            Reset to defaults
          </ResetShortcutsButton>
        </Section>

        <Section>
          <SectionTitle>Music Library Paths</SectionTitle>

          {libraryPaths.length === 0 ? (
            <EmptyNote>No folders added yet. The default system music directory will be scanned.</EmptyNote>
          ) : (
            <PathList>
              {libraryPaths.map((path) => (
                <PathItem key={path}>
                  <PathText title={path}>{path}</PathText>
                  <RemoveButton aria-label={`Remove ${path}`} onClick={() => handleRemove(path)}>
                    <TrashIcon />
                  </RemoveButton>
                </PathItem>
              ))}
            </PathList>
          )}

          <ButtonRow>
            <AddButton onClick={handleAddFolder} disabled={isScanning}>
              <FolderPlusIcon />
              Add folder
            </AddButton>
            <RescanButton onClick={handleRescan} disabled={isScanning || libraryPaths.length === 0}>
              <RescanIcon $spinning={isScanning} />
              Rescan library
            </RescanButton>
            {isScanning && <ScanningBadge>Scanning…</ScanningBadge>}
            {!isScanning && scanSuccess && <SuccessBadge>Library scan complete!</SuccessBadge>}
          </ButtonRow>
        </Section>
      </SettingsContainer>
    </Page>
  );
};

export default Settings;
