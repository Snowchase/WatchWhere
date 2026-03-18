import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlist, useMutateWatchlist } from '../api/watchlist';
import { TitleCard, TitleCardSkeleton } from '../components/title/TitleCard';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { WatchlistItem } from '../types';

function WatchlistItemRow({
  item,
  onRemove,
  onUpdateAlerts,
  isRemoving,
}: {
  item: WatchlistItem;
  onRemove: (titleId: string) => void;
  onUpdateAlerts: (titleId: string, alertOnAdd: boolean, alertOnRemove: boolean) => void;
  isRemoving: boolean;
}) {
  const [alertOnAdd, setAlertOnAdd] = useState(item.alert_on_add);
  const [alertOnRemove, setAlertOnRemove] = useState(item.alert_on_remove);
  const addedDate = new Date(item.added_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleAlertChange = (field: 'add' | 'remove', value: boolean) => {
    const newAdd = field === 'add' ? value : alertOnAdd;
    const newRemove = field === 'remove' ? value : alertOnRemove;
    if (field === 'add') setAlertOnAdd(value);
    else setAlertOnRemove(value);
    onUpdateAlerts(item.title.id, newAdd, newRemove);
  };

  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      {/* Poster thumbnail */}
      <Link to={`/title/${item.title.id}`} className="flex-shrink-0">
        <img
          src={
            item.title.poster_url ??
            'https://via.placeholder.com/80x120/e5e7eb/9ca3af?text=No+Image'
          }
          alt={`${item.title.title} poster`}
          className="h-28 w-20 rounded-lg object-cover shadow sm:h-24 sm:w-16"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://via.placeholder.com/80x120/e5e7eb/9ca3af?text=No+Image';
          }}
        />
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/title/${item.title.id}`}
          className="block text-base font-semibold text-gray-900 hover:text-brand-600 transition truncate"
        >
          {item.title.title}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {item.title.year && <span>{item.title.year}</span>}
          <span className="capitalize">{item.title.type.replace('_', ' ')}</span>
          <span>Added {addedDate}</span>
        </div>

        {item.title.genres.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.title.genres.slice(0, 3).map((genre) => (
              <span key={genre} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Alert toggles */}
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={alertOnAdd}
              onChange={(e) => handleAlertChange('add', e.target.checked)}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Alert when added to platform
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={alertOnRemove}
              onChange={(e) => handleAlertChange('remove', e.target.checked)}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Alert before it leaves
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2 sm:flex-col sm:items-end">
        <Link to={`/title/${item.title.id}`} className="btn-secondary text-xs py-1.5">
          View
        </Link>
        <button
          onClick={() => onRemove(item.title.id)}
          disabled={isRemoving}
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition px-1"
          aria-label={`Remove ${item.title.title} from watchlist`}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function Watchlist() {
  const watchlist = useWatchlist();
  const { remove, update } = useMutateWatchlist();

  const [view, setView] = useState<'list' | 'grid'>('list');

  const handleRemove = (titleId: string) => {
    remove.mutate(titleId);
  };

  const handleUpdateAlerts = (titleId: string, alertOnAdd: boolean, alertOnRemove: boolean) => {
    update.mutate({ titleId, payload: { alert_on_add: alertOnAdd, alert_on_remove: alertOnRemove } });
  };

  const items = watchlist.data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Watchlist</h1>
          <p className="mt-1 text-gray-500">
            {watchlist.isPending
              ? 'Loading…'
              : `${items.length} saved title${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* View toggle */}
        {items.length > 0 && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm transition ${view === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              aria-pressed={view === 'list'}
              aria-label="List view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 text-sm transition ${view === 'grid' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              aria-pressed={view === 'grid'}
              aria-label="Grid view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Loading skeletons */}
      {watchlist.isPending && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <TitleCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {watchlist.isError && (
        <ErrorMessage
          error={watchlist.error}
          title="Could not load watchlist"
          onRetry={() => watchlist.refetch()}
        />
      )}

      {/* Empty state */}
      {!watchlist.isPending && !watchlist.isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <div>
            <p className="text-lg font-semibold text-gray-700">Your watchlist is empty</p>
            <p className="mt-1 text-sm text-gray-400">
              Search for titles and add them to your watchlist to track them here.
            </p>
          </div>
          <Link to="/search" className="btn-primary mt-2">
            Browse titles
          </Link>
        </div>
      )}

      {/* List view */}
      {!watchlist.isPending && items.length > 0 && view === 'list' && (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <WatchlistItemRow
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onUpdateAlerts={handleUpdateAlerts}
              isRemoving={remove.isPending}
            />
          ))}
        </div>
      )}

      {/* Grid view */}
      {!watchlist.isPending && items.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <TitleCard
              key={item.id}
              title={item.title}
              onWatchlistToggle={handleRemove}
              isInWatchlist={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
