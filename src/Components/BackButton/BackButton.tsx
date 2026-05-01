import { Button, AngleLeft } from './styles';

interface Props {
  onClick: () => void;
  children: React.ReactNode;
}

const BackButton = ({ onClick, children }: Props) => (
  <Button onClick={onClick}>
    <AngleLeft /> {children}
  </Button>
);

export default BackButton;
