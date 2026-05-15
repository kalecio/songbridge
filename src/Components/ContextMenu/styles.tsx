import { styled } from 'styled-components';

export const Menu = styled.ul<{ $x: number; $y: number }>`
  position: fixed;
  top: ${(p) => p.$y}px;
  left: ${(p) => p.$x}px;
  margin: 0;
  padding: 0.35rem 0;
  list-style: none;
  min-width: 12rem;
  max-width: 18rem;
  background: ${({ theme }) => theme.surfaceRaised};
  color: ${({ theme }) => theme.textPrimary};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px ${({ theme }) => theme.cardShadowHover};
  z-index: 1000;
  user-select: none;
`;

export const Item = styled.li<{ $disabled?: boolean; $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.9rem;
  cursor: ${(p) => (p.$disabled ? 'default' : 'pointer')};
  color: ${(p) => (p.$danger ? p.theme.error : p.$disabled ? p.theme.textMuted : 'inherit')};
  opacity: ${(p) => (p.$disabled ? 0.6 : 1)};

  &:hover {
    background: ${(p) => (p.$disabled ? 'transparent' : p.theme.accentHover)};
  }

  &:focus-visible {
    outline: none;
    background: ${({ theme }) => theme.accentBg};
  }
`;

export const ItemIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
`;

export const ItemLabel = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const SubmenuChevron = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.75rem;
  height: 0.75rem;
  color: ${({ theme }) => theme.textSecondary};
  flex-shrink: 0;
`;

export const Divider = styled.li`
  height: 1px;
  margin: 0.3rem 0.5rem;
  background: ${({ theme }) => theme.border};
`;
