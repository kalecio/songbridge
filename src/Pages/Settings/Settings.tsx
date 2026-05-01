import { useContext } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '../../Context/AppContext';
import {
  AddButton,
  EmptyNote,
  FolderPlusIcon,
  PathItem,
  PathList,
  PathText,
  RemoveButton,
  Section,
  SectionTitle,
  SettingsContainer,
  TrashIcon,
} from './styles';

const Settings = () => {
  const { libraryPaths, setLibraryPaths, scanLibrary, isScanning } = useContext(AppContext);

  const handleAddFolder = async () => {
    const folder = await open({ directory: true, multiple: false });
    if (!folder || libraryPaths.includes(folder)) return;

    await invoke('db_add_library_path', { path: folder });
    const updated = [...libraryPaths, folder];
    setLibraryPaths?.(updated);
    await scanLibrary?.(updated);
  };

  const handleRemove = async (path: string) => {
    await invoke('db_remove_library_path', { path });
    const updated = libraryPaths.filter((p) => p !== path);
    setLibraryPaths?.(updated);
    await scanLibrary?.(updated);
  };

  return (
    <SettingsContainer>
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

        <AddButton onClick={handleAddFolder} disabled={isScanning}>
          <FolderPlusIcon />
          Add folder
        </AddButton>
      </Section>
    </SettingsContainer>
  );
};

export default Settings;
