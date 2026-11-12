import type { ComponentProps } from 'react';
import TextMarquee from '../TextMarquee/TextMarquee';
import { HeroTitle as StyledHeroTitle } from './styles';

const HeroTitle = ({ children, ...props }: ComponentProps<typeof StyledHeroTitle>) => (
  <StyledHeroTitle {...props}>
    <TextMarquee>{children}</TextMarquee>
  </StyledHeroTitle>
);

export default HeroTitle;
