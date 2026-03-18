import { Link } from 'react-router-dom';
import { Title, Availability } from '../../types';
import { AvailabilityBadge } from './AvailabilityBadge';

interface TitleCardProps {
  title: Title;
  availability?: Availability[];
  /** If provided, shown as a "leaving" warning below the badges */
  leavingDate?: string;
  onWatchlistToggle?: (titleId: string) => void;
  isInWatchlist?: boolean;
}

const PLACEHOLDER_POSTER =
  'https://via.placeholder.com/300x450/e5e7eb/9ca3af?text=No+Image';

function ContentTypePill({ type }: { type: Title['type'] }) {
  const labels: Record<Title['type'], string> = {
    movie: 'Movie',
    tv_show: 'TV',
    anime: 'Anime',
    sport: 'Sport',
  };
  const colors: Record<Title['type'], string> = {
    movie: 'bg-blue-100 text-blue-700',
    tv_show: 'bg-green-100 text-green-700',
    anime: 'bg-pink-100 text-pink-700',
    sport: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

export function TitleCard({
  title,
  availability,
  leavingDate,
  onWatchlistToggle,
  isInWatchlist,
}: TitleCardProps) {
  const daysLeft = leavingDate
    ? Math.ceil(
        (new Date(leavingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <div className="card group relative flex flex-col overflow-hidden transition hover:shadow-md">
      {/* Poster */}
      <Link to={`/title/${title.id}`} className="block aspect-[2/3] overflow-hidden bg-gray-100">
        <img
          src={title.poster_url ?? PLACEHOLDER_POSTER}
          alt={`${title.title} poster`}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_POSTER;
          }}
        />
      </Link>

      {/* Watchlist toggle */}
      {onWatchlistToggle && (
        <button
          onClick={() => onWatchlistToggle(title.id)}
          aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow transition ${
            isInWatchlist
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'bg-white/90 text-gray-600 hover:bg-white hover:text-brand-600'
          }`}
        >
          {isInWatchlist ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          )}
        </button>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/title/${title.id}`}
            className="flex-1 text-sm font-semibold leading-snug text-gray-900 hover:text-brand-600 transition line-clamp-2"
          >
            {title.title}
          </Link>
          <ContentTypePill type={title.type} />
        </div>

        {title.year && (
          <p className="text-xs text-gray-400">{title.year}</p>
        )}

        {title.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {title.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Availability badges */}
        {availability && availability.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {availability.slice(0, 4).map((av) => (
              <AvailabilityBadge key={`${av.platform_slug}-${av.stream_type}`} availability={av} compact />
            ))}
          </div>
        )}

        {/* Leaving warning */}
        {daysLeft !== null && daysLeft >= 0 && (
          <p className="mt-1 text-xs font-medium text-orange-600">
            Leaves in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

/** Skeleton placeholder while loading */
export function TitleCardSkeleton() {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="aspect-[2/3] skeleton" />
      <div className="flex flex-col gap-2 p-3">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/4 rounded" />
        <div className="flex gap-1">
          <div className="skeleton h-3 w-12 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}
