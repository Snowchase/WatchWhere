import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '../components/search/SearchBar';
import { SearchFilters } from '../components/search/SearchFilters';
import { TitleCard, TitleCardSkeleton } from '../components/title/TitleCard';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useSearch } from '../api/search';
import { useWatchlist, useMutateWatchlist } from '../api/watchlist';
import { useAuthStore } from '../store/useAuthStore';
import { ContentType } from '../types';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const typeParam = (searchParams.get('type') ?? '') as ContentType | '';
  const regionParam = searchParams.get('region') ?? '';
  const pageParam = parseInt(searchParams.get('page') ?? '1', 10);

  const [selectedType, setSelectedType] = useState<ContentType | ''>(typeParam);
  const [selectedRegion, setSelectedRegion] = useState(regionParam);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const watchlist = useWatchlist();
  const { add, remove } = useMutateWatchlist();
  const watchlistIds = new Set(watchlist.data?.items.map((w) => w.title.id) ?? []);

  const search = useSearch(
    queryParam,
    selectedType || undefined,
    selectedRegion || undefined,
    pageParam,
  );

  // Sync filter state into URL
  useEffect(() => {
    const updated = new URLSearchParams(searchParams);
    if (selectedType) updated.set('type', selectedType);
    else updated.delete('type');
    if (selectedRegion) updated.set('region', selectedRegion);
    else updated.delete('region');
    updated.set('page', '1');
    setSearchParams(updated, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedRegion]);

  const totalPages = search.data
    ? Math.ceil(search.data.total / (search.data.limit || 20))
    : 1;

  const setPage = (page: number) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('page', String(page));
    setSearchParams(updated);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      {/* Search header */}
      <div className="mb-6">
        <SearchBar />
        {queryParam && (
          <p className="mt-2 text-sm text-gray-500">
            {search.isPending
              ? 'Searching…'
              : `${search.data?.total ?? 0} results for "${queryParam}"`}
          </p>
        )}
      </div>

      {!queryParam && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg font-medium text-gray-400">Enter a search term to get started</p>
        </div>
      )}

      {queryParam && (
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Sidebar filters */}
          <div className="w-full flex-shrink-0 md:w-52">
            <SearchFilters
              selectedType={selectedType}
              selectedRegion={selectedRegion}
              onTypeChange={setSelectedType}
              onRegionChange={setSelectedRegion}
            />
          </div>

          {/* Results */}
          <div className="flex-1">
            {search.isError && (
              <ErrorMessage
                error={search.error}
                onRetry={() => search.refetch()}
                className="mb-4"
              />
            )}

            {!search.isPending && !search.isError && search.data?.items.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">No results found for "{queryParam}"</p>
                <p className="text-sm text-gray-400">Try a different search term or remove filters.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {search.isPending
                ? Array.from({ length: 12 }).map((_, i) => <TitleCardSkeleton key={i} />)
                : search.data?.items.map((title) => (
                    <TitleCard
                      key={title.id}
                      title={title}
                      onWatchlistToggle={isAuthenticated ? handleWatchlistToggle : undefined}
                      isInWatchlist={watchlistIds.has(title.id)}
                    />
                  ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(pageParam - 1)}
                  disabled={pageParam <= 1}
                  className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pageParam} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(pageParam + 1)}
                  disabled={pageParam >= totalPages}
                  className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
