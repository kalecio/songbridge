import { styled } from 'styled-components';

export const HeroWrapper = styled.div`
  width: 100%;
  align-self: flex-start;
`;

export const Hero = styled.div`
  position: relative;
  height: 320px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

export const HeroBg = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.08);
  filter: blur(18px) brightness(0.55);
`;

export const HeroPlaceholder = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, ${({ theme }) => theme.primaryDark}, ${({ theme }) => theme.accent});
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const PlaceholderInitial = styled.span`
  font-size: 8rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.25);
  user-select: none;
`;

export const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.65) 100%);
`;

export const HeroTop = styled.div`
  position: relative;
  z-index: 1;
  padding: 1.25rem 1.5rem;
`;

export const HeroBottom = styled.div`
  position: relative;
  z-index: 1;
  padding: 1.5rem 2rem;
`;

export const HeroStats = styled.div`
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.9rem;
  max-height: 2rem;
`;

export const HeroContent = styled.div`
  background: ${({ theme }) => theme.background};
`;
