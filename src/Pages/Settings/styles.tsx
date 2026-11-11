import { styled, keyframes, css } from 'styled-components';
import { FaFolderPlus, FaTrash, FaArrowsRotate } from 'react-icons/fa6';

export const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 900px;
  padding: 0;
  gap: 2.25rem;
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0 0 1.5rem;
`;

export const SectionTitle = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.textPrimary};
  margin: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  letter-spacing: -0.02em;
`;

export const PathList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const PathItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.4rem;
  padding: 0.75rem 0.9rem;
  min-height: 2.75rem;
`;

export const PathText = styled.span`
  flex: 1;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.textPrimary};
  word-break: break-all;
`;

export const RemoveButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.primary};
  display: flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 0.25rem;
  transition: color 0.15s;
  flex-shrink: 0;
  max-width: 1.5rem;

  &:hover {
    color: ${({ theme }) => theme.error};
  }
`;

export const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => theme.textOnPrimary};
  border: none;
  border-radius: 2rem;
  padding: 0.5rem 1.2rem;
  font-size: 0.875rem;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.15s;
  min-height: 2.5rem;

  &:hover {
    background: ${({ theme }) => theme.primaryDark};
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

export const EmptyNote = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.primary};
  margin: 0;
`;

const iconStyle = `
  max-height: 1rem;
  max-width: 1rem;
`;

export const TrashIcon = styled(FaTrash)`
  ${iconStyle}
`;
export const FolderPlusIcon = styled(FaFolderPlus)`
  ${iconStyle}
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  gap: 0.75rem;
  max-height: none;
`;

export const RescanButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  color: ${({ theme }) => theme.primary};
  border: 1.5px solid ${({ theme }) => theme.primary};
  border-radius: 2rem;
  padding: 0.5rem 1.2rem;
  font-size: 0.875rem;
  cursor: pointer;
  align-self: flex-start;
  transition:
    background 0.15s,
    color 0.15s;
  min-height: 2.5rem;

  &:hover {
    background: ${({ theme }) => theme.surfaceRaised};
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

export const RescanIcon = styled(FaArrowsRotate)<{ $spinning?: boolean }>`
  ${iconStyle}
  ${({ $spinning }) =>
    $spinning &&
    css`
      animation: ${spin} 1s linear infinite;
    `}
`;

export const ScanningBadge = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.primary};
`;

export const SuccessBadge = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.success};
`;

export const ThemeRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  min-height: 2.5rem;
`;

export const ThemeLabel = styled.label`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.textPrimary};
  min-width: 4rem;
`;

export const CreateThemePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.5rem;
  background: ${({ theme }) => theme.surface};
`;

export const CreateThemeHeader = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.textPrimary};
  font-size: 1rem;
  font-weight: 600;
`;

export const ThemeTextField = styled.label`
  display: flex;
  flex: 1 1 220px;
  flex-direction: column;
  gap: 0.4rem;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.8rem;
`;

export const ThemeSourceField = styled(ThemeTextField)`
  max-width: 260px;
`;

export const ThemeNameInput = styled.input`
  width: 100%;
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.borderLight};
  border-radius: 0.4rem;
  background: ${({ theme }) => theme.background};
  color: ${({ theme }) => theme.textPrimary};
  font: inherit;

  &:focus {
    border-color: ${({ theme }) => theme.accent};
    outline: none;
  }
`;

export const ThemeNameError = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.error};
  font-size: 0.8rem;
`;

export const ThemeColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 480px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const ThemeColorField = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.55rem 0.7rem;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.4rem;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 0.8rem;
`;

export const ThemeColorInput = styled.input`
  width: 2.5rem;
  height: 2rem;
  padding: 2px;
  border: 1px solid ${({ theme }) => theme.borderLight};
  border-radius: 0.3rem;
  background: ${({ theme }) => theme.background};
  cursor: pointer;
`;

export const CreateThemeActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
`;

export const CreateThemeButton = styled.button`
  min-height: 2.5rem;
  padding: 0.5rem 1rem;
  border: 0;
  border-radius: 0.4rem;
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => theme.textOnPrimary};
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.primaryDark};
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`;

export const CancelThemeButton = styled.button`
  min-height: 2.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid ${({ theme }) => theme.borderLight};
  border-radius: 0.4rem;
  background: transparent;
  color: ${({ theme }) => theme.textSecondary};
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.hover};
  }
`;

export const ShortcutList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const ShortcutRow = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.4rem;
  padding: 0.75rem 0.9rem;
`;

export const ShortcutLabel = styled.span`
  flex: 1;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.textPrimary};
`;

export const ShortcutKey = styled.button<{ $recording?: boolean }>`
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.3rem 0.7rem;
  border-radius: 0.4rem;
  border: 1px solid ${({ theme, $recording }) => ($recording ? theme.primary : theme.borderLight)};
  background: ${({ theme, $recording }) => ($recording ? theme.hoverActive : theme.surface)};
  color: ${({ theme, $recording }) => ($recording ? theme.primaryDark : theme.textPrimary)};
  cursor: pointer;
  min-width: 5rem;
  text-align: center;
  transition:
    border-color 0.15s,
    background 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.primary};
  }
`;

export const ResetShortcutsButton = styled.button`
  align-self: flex-start;
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary};
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.25rem 0;

  &:hover {
    color: ${({ theme }) => theme.primaryDark};
    text-decoration: underline;
  }
`;

export const ThemeSelect = styled.select`
  -webkit-appearance: none;
  appearance: none;
  padding: 0.4rem 2rem 0.4rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.borderLight};
  border-radius: 0.5rem;
  background-color: ${({ theme }) => theme.surfaceRaised};
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237A8194' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.65rem center;
  color: ${({ theme }) => theme.textPrimary};
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;
