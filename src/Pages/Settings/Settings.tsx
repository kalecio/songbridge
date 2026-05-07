import { useContext, useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import { themes } from '../../theme';
import { DEFAULT_SHORTCUTS, SHORTCUT_LABELS, ShortcutAction, eventToBinding, formatBinding } from '../../keyboard';
import {
  AddButton,
  ButtonRow,
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
  ThemeRow,
  ThemeSelect,
  TrashIcon,
} from './styles';

const Settings = () => {
  const {
    libraryPaths,
    setLibraryPaths,
    scanLibrary,
    isScanning,
    currentTheme,
    setCurrentTheme,
    shortcuts,
    setShortcuts,
  } = useContext(AppContext);
  const [scanSuccess, setScanSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState<ShortcutAction | null>(null);

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

  return (
    <SettingsContainer>
      <Section>
        <SectionTitle>Appearance</SectionTitle>
        <ThemeRow>
          <ThemeLabel htmlFor="theme-select">Theme</ThemeLabel>
          <ThemeSelect id="theme-select" value={currentTheme} onChange={(e) => setCurrentTheme?.(e.target.value)}>
            {Object.keys(themes).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </ThemeSelect>
        </ThemeRow>
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
        <ResetShortcutsButton onClick={() => setShortcuts?.(DEFAULT_SHORTCUTS)}>Reset to defaults</ResetShortcutsButton>
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
  );
};

export default Settings;
