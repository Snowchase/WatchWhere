import { useParams, Link } from 'react-router-dom';
import { useTitle, useTitleAvailability } from '../api/titles';
import { useWatchlist, useMutateWatchlist } from '../api/watchlist';
import { useAuthStore } from '../store/useAuthStore';
import { AvailabilityBadge } from '../components/title/AvailabilityBadge';
import { FullPageSpinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

const PLACEHOLDER_POSTER =
  'https://via.placeholder.com/300x450/e5e7eb/9ca3af?text=No+Image';

const TYPE_LABELS = {
  movie: 'Movie',
  tv_show: 'TV Show',
  anime: 'Anime',
  sport: 'Sport',
} as const;

export default function TitleDetail() {
  const { id } = useParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const title = useTitle(id);
  const availability = useTitleAvailability(id, user?.region);
  const watchlist = useWatchlist();
  const { add, remove } = useMutateWatchlist();

  const isInWatchlist = watchlist.data?.items.some((w) => w.title.id === id) ?? false;

  const handleWatchlistToggle = () => {
    if (!isAuthenticated || !id) return;
    if (isInWatchlist) {
      remove.mutate(id);
    } else {
      add.mutate({ title_id: id, alert_on_add: true, alert_on_remove: true });
    }
  };

  if (title.isPending) return <FullPageSpinner />;

  if (title.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <ErrorMessage
          error={title.error}
          title="Could not load title"
          onRetry={() => title.refetch()}
        />
        <Link to="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const t = title.data!;
  const avail = availability.data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero band */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 py-10 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 sm:flex-row sm:px-6 lg:px-8">
          {/* Poster */}
          <div className="mx-auto w-40 flex-shrink-0 sm:mx-0 sm:w-52">
            <img
              src={t.poster_url ?? PLACEHOLDER_POSTER}
              alt={`${t.title} poster`}
              className="w-full rounded-xl shadow-2xl ring-1 ring-white/10 object-cover aspect-[2/3]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_POSTER;
              }}
            />
          </div>

          {/* Meta */}
          <div className="flex flex-1 flex-col justify-center gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
                  {TYPE_LABELS[t.type]}
                </span>
                {t.year && <span>{t.year}</span>}
                {t.imdb_id && (
                  <a
                    href={`https://www.imdb.com/title/${t.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300"
                  >
                    IMDb
                  </a>
                )}
              </div>
              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">{t.title}</h1>
            </div>

            {t.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {t.genres.map((genre) => (
                  <Link
                    key={genre}
                    to={`/search?q=&genre=${encodeURIComponent(genre)}`}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-gray-300 hover:border-white/40 hover:text-white transition"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}

            {t.description && (
              <p className="text-sm leading-relaxed text-gray-300 line-clamp-4 sm:line-clamp-none">
                {t.description}
              </p>
            )}

            {/* Watchlist CTA */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <button
                  onClick={handleWatchlistToggle}
                  disabled={add.isPending || remove.isPending}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                    isInWatchlist
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isInWatchlist ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                      In Watchlist
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add to Watchlist
                    </>
                  )}
                </button>
              ) : (
                <Link to="/settings" className="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm">
                  Sign in to save
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Availability section */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Where to watch</h2>

        {availability.isPending && (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        )}

        {availability.isError && (
          <ErrorMessage
            error={availability.error}
            title="Could not load availability data"
            onRetry={() => availability.refetch()}
          />
        )}

        {avail && avail.availability.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-gray-500">
            <p className="text-sm">No streaming options found for your region.</p>
            {!user?.region && (
              <p className="mt-1 text-xs text-gray-400">
                <Link to="/settings" className="text-brand-600 hover:underline">Set your region</Link> to see local availability.
              </p>
            )}
          </div>
        )}

        {avail && avail.availability.length > 0 && (
          <>
            {avail.region && (
              <p className="mb-3 text-xs text-gray-400">
                Showing availability for region: <strong>{avail.region}</strong>
                {' · '}Updated {new Date(avail.last_updated).toLocaleDateString()}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {avail.availability.map((av) => (
                <AvailabilityBadge
                  key={`${av.platform_slug}-${av.stream_type}`}
                  availability={av}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Back link */}
      <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-brand-600 hover:text-brand-700 hover:underline">
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
