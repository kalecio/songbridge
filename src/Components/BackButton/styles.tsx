import { FaAngleLeft } from 'react-icons/fa6';
import { styled } from 'styled-components';

export const AngleLeft = styled(FaAngleLeft)`
  max-height: 1rem;
  max-width: 1rem;
`;

export const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  max-height: 3rem;
  max-width: 6rem;
  background: #9b7ebd;
  border: none;
  border-radius: 2rem;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.4rem 0.9rem;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: #e4d4f7;
    color: #5a3a7a;
  }
`;
