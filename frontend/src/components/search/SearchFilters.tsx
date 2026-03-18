import { ContentType } from '../../types';

interface SearchFiltersProps {
  selectedType: ContentType | '';
  selectedRegion: string;
  onTypeChange: (type: ContentType | '') => void;
  onRegionChange: (region: string) => void;
}

const CONTENT_TYPES: { value: ContentType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv_show', label: 'TV Shows' },
  { value: 'anime', label: 'Anime' },
  { value: 'sport', label: 'Sports' },
];

const REGIONS = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
];

export function SearchFilters({
  selectedType,
  selectedRegion,
  onTypeChange,
  onRegionChange,
}: SearchFiltersProps) {
  return (
    <aside className="w-full space-y-6">
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Content type
        </h2>
        <div className="space-y-1">
          {CONTENT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onTypeChange(value as ContentType | '')}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                selectedType === value
                  ? 'bg-brand-100 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Region
        </h2>
        <select
          value={selectedRegion}
          onChange={(e) => onRegionChange(e.target.value)}
          className="input-base"
          aria-label="Filter by region"
        >
          <option value="">All regions</option>
          {REGIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
