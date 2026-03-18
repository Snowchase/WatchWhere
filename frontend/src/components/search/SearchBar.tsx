import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface SearchBarProps {
  autoFocus?: boolean;
  size?: 'default' | 'large';
  placeholder?: string;
  onSearch?: (q: string) => void;
}

export function SearchBar({
  autoFocus = false,
  size = 'default',
  placeholder = 'Search for movies, TV shows, anime…',
  onSearch,
}: SearchBarProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (onSearch) {
      onSearch(q);
    } else {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const inputClass =
    size === 'large'
      ? 'input-base pl-12 pr-4 py-4 text-base rounded-xl shadow-md'
      : 'input-base pl-10 pr-4 py-2.5 text-sm';

  const iconClass =
    size === 'large'
      ? 'pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400'
      : 'pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400';

  const iconSize = size === 'large' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <div className="relative flex items-center">
        <span className={iconClass} aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={iconSize}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label="Search titles"
          className={`${inputClass} flex-1`}
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            aria-label="Clear search"
            className="absolute right-14 text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          type="submit"
          className={`absolute right-2 btn-primary ${size === 'large' ? 'px-5 py-2.5' : 'px-3 py-1.5 text-xs'}`}
        >
          Search
        </button>
      </div>
    </form>
  );
}
