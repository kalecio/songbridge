import { styled } from 'styled-components';
import { selectable } from '../../styles/mixins';

export const HeroTitle = styled.h1`
  color: #fff;
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${selectable}
`;
