import { styled } from 'styled-components';
import { FaTrash, FaMinus, FaPlus } from 'react-icons/fa6';

export const Container = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

export const LeftPanel = styled.aside`
  width: 220px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.surfaceRaised};
  border-right: 1px solid ${({ theme }) => theme.borderLight};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  align-items: center;
`;

export const NewButton = styled.button`
  margin: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => theme.textOnPrimary};
  border: none;
  border-radius: 2rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
  max-height: 2.5rem;
  max-width: 8rem;

  &:hover {
    background: ${({ theme }) => theme.primaryDark};
  }
`;

export const PlaylistItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  background: ${(p) => (p.$active ? p.theme.active : 'transparent')};
  border-left: 3px solid ${(p) => (p.$active ? p.theme.primary : 'transparent')};
  transition: background 0.15s;
  max-height: 4rem;

  &:hover {
    background: ${(p) => (p.$active ? p.theme.active : p.theme.hover)};
  }
`;

export const PlaylistItemInfo = styled.div`
  flex: 1;
  overflow: hidden;
  justify-content: center;
  display: flex;
  flex-direction: column;
`;

export const PlaylistItemName = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${({ theme }) => theme.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 1.5rem;
`;

export const PlaylistItemCount = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.primary};
  max-height: 1.5rem;
`;

export const DeleteBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.mutedAccent};
  display: flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  transition: color 0.15s;
  max-width: 1.5rem;
  max-height: 1.5rem;

  &:hover {
    color: ${({ theme }) => theme.error};
  }
`;

export const RightPanel = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.5rem 2rem;
  gap: 1rem;
`;

export const EmptyState = styled.p`
  margin: auto;
  color: ${({ theme }) => theme.primary};
  font-size: 0.9rem;
`;

export const EditorHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-direction: column;
  max-height: 4rem;
`;

export const NameInput = styled.input`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.textPrimary};
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  outline: none;
  padding: 0.1rem 0.2rem;
  transition: border-color 0.15s;
  max-height: 2rem;

  &:focus {
    border-bottom-color: ${({ theme }) => theme.primary};
  }
`;

export const SongCount = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.primary};
  max-height: 2rem;
`;

export const TwoColumn = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  flex: 1;
  overflow: hidden;
`;

export const Column = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
`;

export const ColumnTitle = styled.h3`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.primaryDark};
  margin: 0 0 0.25rem;
  max-height: 1.5rem;
`;

export const SearchInput = styled.input`
  padding: 0.4rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.borderLight};
  border-radius: 2rem;
  font-size: 0.8rem;
  outline: none;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.textPrimary};
  max-height: 2.5rem;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

export const SongScroll = styled.div`
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

export const SongRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  border-radius: 0.5rem;
  transition: background 0.1s;
  max-height: 3rem;

  &:hover {
    background: ${({ theme }) => theme.hover};
  }
`;

export const SongMeta = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const SongTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 500;
  color: ${({ theme }) => theme.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const SongArtist = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const IconButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  transition: color 0.15s;
  max-width: 1rem;
`;

export const RemoveIcon = styled(FaMinus)`
  max-width: 0.75rem;
  max-height: 0.75rem;
  color: ${({ theme }) => theme.mutedAccent};

  ${IconButton}:hover & {
    color: ${({ theme }) => theme.error};
  }
`;

export const AddIcon = styled(FaPlus)`
  max-width: 0.75rem;
  max-height: 0.75rem;
  color: ${({ theme }) => theme.mutedAccent};

  ${IconButton}:hover & {
    color: ${({ theme }) => theme.primaryDark};
  }
`;

export const TrashIcon = styled(FaTrash)`
  max-width: 0.75rem;
  max-height: 0.75rem;
`;

export const EmptyColumn = styled.p`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.mutedAccent};
  margin: 0;
`;
