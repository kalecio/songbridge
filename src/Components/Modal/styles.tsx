import { styled } from 'styled-components';

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
`;

export const Surface = styled.div`
  background: ${({ theme }) => theme.cardBackground};
  color: ${({ theme }) => theme.textPrimary};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.75rem;
  box-shadow: 0 16px 48px ${({ theme }) => theme.cardShadowHover};
  width: 100%;
  max-width: 24rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Header = styled.header`
  padding: 1rem 1.25rem 0.5rem;
`;

export const Title = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

export const Body = styled.div`
  padding: 0.25rem 1.25rem 1rem;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.textSecondary};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const Footer = styled.footer`
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  background: ${({ theme }) => theme.surfaceAlt};
  border-top: 1px solid ${({ theme }) => theme.border};
`;

export const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'ghost' }>`
  appearance: none;
  border: 1px solid transparent;
  padding: 0.5rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 0.5rem;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;

  ${(p) => {
    switch (p.$variant) {
      case 'danger':
        return `
          background: ${p.theme.error};
          color: ${p.theme.textOnPrimary};
          &:hover { filter: brightness(1.1); }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${p.theme.textPrimary};
          border-color: ${p.theme.border};
          &:hover { background: ${p.theme.hover}; }
        `;
      case 'primary':
      default:
        return `
          background: ${p.theme.primary};
          color: ${p.theme.textOnPrimary};
          &:hover { background: ${p.theme.primaryDark}; }
        `;
    }
  }}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent};
    outline-offset: 2px;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.textPrimary};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 0.5rem;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.accent};
  }
`;

export const Message = styled.p`
  margin: 0;
`;
