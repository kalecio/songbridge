import { ChangeEvent } from 'react';
import { Controls, Search, SortSelect } from './styles';

export interface SortOption {
  value: string;
  label: string;
}

interface Props {
  query: string;
  onQueryChange: (_query: string) => void;
  sortBy: string;
  onSortChange: (_sortBy: string) => void;
  sortOptions: SortOption[];
  searchLabel: string;
}

const LibraryControls = ({ query, onQueryChange, sortBy, onSortChange, sortOptions, searchLabel }: Props) => {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value);

  return (
    <Controls>
      <Search type="search" value={query} onChange={handleSearchChange} placeholder={searchLabel} aria-label={searchLabel} />
      <SortSelect value={sortBy} onChange={(event) => onSortChange(event.target.value)} aria-label="Sort library">
        {sortOptions.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </SortSelect>
    </Controls>
  );
};

export default LibraryControls;
