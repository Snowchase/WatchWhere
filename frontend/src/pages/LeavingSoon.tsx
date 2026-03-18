import { useState } from 'react';
import { useLeavingSoon } from '../api/sports';
import { TitleCard, TitleCardSkeleton } from '../components/title/TitleCard';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useWatchlist, useMutateWatchlist } from '../api/watchlist';
import { useAuthStore } from '../store/useAuthStore';

const PLATFORMS = [
  { value: '', label: 'All platforms' },
  { value: 'netflix', label: 'Netflix' },
  { value: 'hulu', label: 'Hulu' },
  { value: 'disney-plus', label: 'Disney+' },
  { value: 'hbo-max', label: 'Max (HBO)' },
  { value: 'amazon-prime', label: 'Amazon Prime' },
  { value: 'apple-tv-plus', label: 'Apple TV+' },
  { value: 'peacock', label: 'Peacock' },
  { value: 'paramount-plus', label: 'Paramount+' },
];

const REGIONS = [
  { value: '', label: 'All regions' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
];

export default function LeavingSoon() {
  const [platform, setPlatform] = useState('');
  const [region, setRegion] = useState('');
  const [page, setPage] = useState(1);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const watchlist = useWatchlist();
  const { add, remove } = useMutateWatchlist();
  const watchlistIds = new Set(watchlist.data?.items.map((w) => w.title.id) ?? []);

  const leavingSoon = useLeavingSoon(
    region || undefined,
    platform || undefined,
    page,
    24,
  );

  const totalPages = leavingSoon.data
    ? Math.ceil(leavingSoon.data.total / (leavingSoon.data.limit || 24))
    : 1;

  const handleWatchlistToggle = (titleId: string) => {
    if (!isAuthenticated) return;
    if (watchlistIds.has(titleId)) {
      remove.mutate(titleId);
    } else {
      add.mutate({ title_id: titleId });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leaving Soon</h1>
        <p className="mt-1 text-gray-500">
          Content expiring from streaming platforms within the next 30 days
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
          className="input-base w-auto text-sm"
          aria-label="Filter by platform"
        >
          {PLATFORMS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={region}
          onChange={(e) => { setRegion(e.target.value); setPage(1); }}
          className="input-base w-auto text-sm"
          aria-label="Filter by region"
        >
          {REGIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {(platform || region) && (
          <button
            onClick={() => { setPlatform(''); setRegion(''); setPage(1); }}
            className="btn-ghost text-sm text-gray-500"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Error */}
      {leavingSoon.isError && (
        <ErrorMessage
          error={leavingSoon.error}
          title="Could not load leaving-soon titles"
          onRetry={() => leavingSoon.refetch()}
          className="mb-6"
        />
      )}

      {/* Empty state */}
      {!leavingSoon.isPending && !leavingSoon.isError && leavingSoon.data?.items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">Nothing leaving soon</p>
          <p className="text-sm text-gray-400">No titles are expiring in the next 30 days with these filters.</p>
        </div>
      )}

      {/* Count */}
      {leavingSoon.data && leavingSoon.data.items.length > 0 && (
        <p className="mb-4 text-sm text-gray-500">
          {leavingSoon.data.total} title{leavingSoon.data.total !== 1 ? 's' : ''} leaving soon
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {leavingSoon.isPending
          ? Array.from({ length: 12 }).map((_, i) => <TitleCardSkeleton key={i} />)
          : leavingSoon.data?.items.map((item) => (
              <TitleCard
                key={item.title.id}
                title={item.title}
                leavingDate={item.available_until}
                onWatchlistToggle={isAuthenticated ? handleWatchlistToggle : undefined}
                isInWatchlist={watchlistIds.has(item.title.id)}
              />
            ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Sign-in prompt */}
      {!isAuthenticated && (
        <div className="mt-10 rounded-xl border border-brand-100 bg-brand-50 p-6 text-center">
          <p className="font-medium text-brand-800">Want to be notified before titles leave?</p>
          <p className="mt-1 text-sm text-brand-600">
            Add titles to your watchlist and we'll alert you before they expire.
          </p>
        </div>
      )}
    </div>
  );
}
