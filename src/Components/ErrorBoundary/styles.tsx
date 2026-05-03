import { styled } from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  gap: 1rem;
  padding: 2rem;
  background: #faf5ff;
`;

export const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: #3a1f5a;
  margin: 0;
`;

export const Message = styled.p`
  font-size: 0.9rem;
  color: #6b4c8a;
  margin: 0;
  text-align: center;
  max-width: 400px;
`;

export const Detail = styled.code`
  font-size: 0.8rem;
  color: #9b7ebd;
  background: #f3e8ff;
  border: 1px solid #d4b8f0;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  max-width: 500px;
  word-break: break-word;
  text-align: center;
`;

export const ReloadButton = styled.button`
  margin-top: 0.5rem;
  background: #9b7ebd;
  color: #fff;
  border: none;
  border-radius: 2rem;
  padding: 0.5rem 1.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #7f55b1;
  }
`;
