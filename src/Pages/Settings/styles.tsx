import { styled, keyframes, css } from 'styled-components';
import { FaFolderPlus, FaTrash, FaArrowsRotate } from 'react-icons/fa6';

export const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  padding: 2.5rem 2rem;
  gap: 2rem;
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const SectionTitle = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  color: #3a1f5a;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #d4b8f0;
  max-height: 1.5rem;
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
  background: #f3e8ff;
  border: 1px solid #d4b8f0;
  border-radius: 0.5rem;
  padding: 0.6rem 0.9rem;
  max-height: 2.5rem;
`;

export const PathText = styled.span`
  flex: 1;
  font-size: 0.85rem;
  color: #3a1f5a;
  word-break: break-all;
`;

export const RemoveButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #9b7ebd;
  display: flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 0.25rem;
  transition: color 0.15s;
  flex-shrink: 0;
  max-width: 1.5rem;

  &:hover {
    color: #c0392b;
  }
`;

export const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #9b7ebd;
  color: #fff;
  border: none;
  border-radius: 2rem;
  padding: 0.5rem 1.2rem;
  font-size: 0.875rem;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.15s;
  max-height: 2.5rem;

  &:hover {
    background: #7f55b1;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

export const EmptyNote = styled.p`
  font-size: 0.85rem;
  color: #9b7ebd;
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
  max-height: 12rem;
`;

export const RescanButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  color: #9b7ebd;
  border: 1.5px solid #9b7ebd;
  border-radius: 2rem;
  padding: 0.5rem 1.2rem;
  font-size: 0.875rem;
  cursor: pointer;
  align-self: flex-start;
  transition:
    background 0.15s,
    color 0.15s;
  max-height: 2.5rem;

  &:hover {
    background: #f3e8ff;
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
  color: #9b7ebd;
`;

export const SuccessBadge = styled.span`
  font-size: 0.8rem;
  color: #2e7d32;
`;
