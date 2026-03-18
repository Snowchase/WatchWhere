import { Link } from 'react-router-dom';
import { SearchBar } from '../components/search/SearchBar';
import { TitleCard, TitleCardSkeleton } from '../components/title/TitleCard';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useBrowse } from '../api/search';
import { useLeavingSoon } from '../api/sports';
import { useAuthStore } from '../store/useAuthStore';
import { useMutateWatchlist, useWatchlist } from '../api/watchlist';

const FEATURED_TYPES = ['movie', 'tv_show'] as const;

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const featured = useBrowse(undefined, undefined, undefined, undefined, 1, 8);
  const newMovies = useBrowse('movie', undefined, undefined, undefined, 1, 6);
  const newShows = useBrowse('tv_show', undefined, undefined, undefined, 1, 6);
  const leavingSoon = useLeavingSoon(undefined, undefined, 1, 4);
  const watchlist = useWatchlist();
  const { add, remove } = useMutateWatchlist();

  const watchlistIds = new Set(watchlist.data?.items.map((w) => w.title.id) ?? []);

  const handleWatchlistToggle = (titleId: string) => {
    if (!isAuthenticated) return;
    if (watchlistIds.has(titleId)) {
      remove.mutate(titleId);
    } else {
      add.mutate({ title_id: titleId });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-indigo-900 py-20 px-4 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Find where to watch anything
          </h1>
          <p className="mb-8 text-lg text-brand-200">
            Search movies, TV shows, anime, and sports across every streaming platform, all in one place.
          </p>
          <SearchBar size="large" placeholder="Search movies, shows, anime, sports…" autoFocus />
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-brand-300">
            <span>Try:</span>
            {['Oppenheimer', 'The Bear', 'Attack on Titan', 'Premier League'].map((q) => (
              <Link
                key={q}
                to={`/search?q=${encodeURIComponent(q)}`}
                className="rounded-full border border-brand-500 px-3 py-0.5 hover:bg-brand-700 transition"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          {[
            { to: '/search?q=&type=movie', label: 'Movies' },
            { to: '/search?q=&type=tv_show', label: 'TV Shows' },
            { to: '/search?q=&type=anime', label: 'Anime' },
            { to: '/sports', label: 'Live Sports' },
            { to: '/leaving-soon', label: 'Leaving Soon' },
          ].map(({ to, label }) => (
            <Link key={to} to={to} className="btn-ghost rounded-full border border-gray-200 py-1.5 text-sm">
              {label}
            </Link>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12">
        {/* Featured content */}
        <section aria-labelledby="featured-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="featured-heading" className="text-xl font-bold text-gray-900">
              Featured
            </h2>
            <Link to="/search" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Browse all
            </Link>
          </div>

          {featured.isError && (
            <ErrorMessage error={featured.error} onRetry={() => featured.refetch()} />
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {featured.isPending
              ? Array.from({ length: 8 }).map((_, i) => <TitleCardSkeleton key={i} />)
              : featured.data?.items.map((title) => (
                  <TitleCard
                    key={title.id}
                    title={title}
                    onWatchlistToggle={isAuthenticated ? handleWatchlistToggle : undefined}
                    isInWatchlist={watchlistIds.has(title.id)}
                  />
                ))}
          </div>
        </section>

        {/* New Movies */}
        <section aria-labelledby="new-movies-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="new-movies-heading" className="text-xl font-bold text-gray-900">
              New Movies
            </h2>
            <Link to="/search?q=&type=movie" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              See all movies
            </Link>
          </div>

          {newMovies.isError && (
            <ErrorMessage error={newMovies.error} onRetry={() => newMovies.refetch()} />
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {newMovies.isPending
              ? Array.from({ length: 6 }).map((_, i) => <TitleCardSkeleton key={i} />)
              : newMovies.data?.items.map((title) => (
                  <TitleCard
                    key={title.id}
                    title={title}
                    onWatchlistToggle={isAuthenticated ? handleWatchlistToggle : undefined}
                    isInWatchlist={watchlistIds.has(title.id)}
                  />
                ))}
          </div>
        </section>

        {/* New TV Shows */}
        <section aria-labelledby="new-shows-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="new-shows-heading" className="text-xl font-bold text-gray-900">
              TV Shows
            </h2>
            <Link to="/search?q=&type=tv_show" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              See all shows
            </Link>
          </div>

          {newShows.isError && (
            <ErrorMessage error={newShows.error} onRetry={() => newShows.refetch()} />
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {newShows.isPending
              ? Array.from({ length: 6 }).map((_, i) => <TitleCardSkeleton key={i} />)
              : newShows.data?.items.map((title) => (
                  <TitleCard
                    key={title.id}
                    title={title}
                    onWatchlistToggle={isAuthenticated ? handleWatchlistToggle : undefined}
                    isInWatchlist={watchlistIds.has(title.id)}
                  />
                ))}
          </div>
        </section>

        {/* Leaving Soon preview */}
        <section aria-labelledby="leaving-soon-heading" className="rounded-2xl bg-orange-50 border border-orange-100 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 id="leaving-soon-heading" className="text-xl font-bold text-gray-900">
                Leaving Soon
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">Content expiring in the next 30 days</p>
            </div>
            <Link to="/leaving-soon" className="text-sm font-medium text-orange-600 hover:text-orange-700">
              View all
            </Link>
          </div>

          {leavingSoon.isError && (
            <ErrorMessage error={leavingSoon.error} onRetry={() => leavingSoon.refetch()} />
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {leavingSoon.isPending
              ? Array.from({ length: 4 }).map((_, i) => <TitleCardSkeleton key={i} />)
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
        </section>

        {/* CTA for non-authenticated users */}
        {!isAuthenticated && (
          <section className="rounded-2xl bg-brand-600 px-8 py-12 text-center text-white">
            <h2 className="text-2xl font-bold">Never miss a title again</h2>
            <p className="mt-2 text-brand-200">
              Sign in to save your watchlist and get alerts when your titles become available or are about to leave.
            </p>
            <Link to="/settings" className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition">
              Get started for free
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
