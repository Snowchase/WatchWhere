import { useState } from 'react';
import { useUpcomingSports } from '../api/sports';
import { SportsEvent } from '../types';
import { FullPageSpinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

const LEAGUES = [
  { value: '', label: 'All leagues' },
  { value: 'NFL', label: 'NFL' },
  { value: 'NBA', label: 'NBA' },
  { value: 'MLB', label: 'MLB' },
  { value: 'NHL', label: 'NHL' },
  { value: 'EPL', label: 'Premier League' },
  { value: 'UCL', label: 'Champions League' },
  { value: 'MLS', label: 'MLS' },
  { value: 'F1', label: 'Formula 1' },
];

const REGIONS = [
  { value: '', label: 'All regions' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
];

function formatEventTime(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

function SportsEventCard({ event }: { event: SportsEvent }) {
  const { date, time } = formatEventTime(event.event_time);
  const isLive =
    new Date(event.event_time).getTime() <= Date.now() &&
    Date.now() <= new Date(event.event_time).getTime() + 3 * 60 * 60 * 1000;

  return (
    <div className="card flex flex-col gap-3 p-4 hover:shadow-md transition">
      {/* League badge + live indicator */}
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          {event.league}
        </span>
        {isLive && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            LIVE
          </span>
        )}
      </div>

      {/* Match */}
      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <p className="text-base font-bold text-gray-900 leading-tight">{event.home_team}</p>
          <p className="text-xs text-gray-400">Home</p>
        </div>
        <div className="flex-shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500">
          VS
        </div>
        <div className="flex-1 text-center">
          <p className="text-base font-bold text-gray-900 leading-tight">{event.away_team}</p>
          <p className="text-xs text-gray-400">Away</p>
        </div>
      </div>

      {/* Date/time */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{date}</span>
        <span>·</span>
        <span>{time}</span>
      </div>

      {/* Broadcast channels */}
      {event.broadcast_ids.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {event.broadcast_ids.map((ch) => (
            <span key={ch} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {ch}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sports() {
  const [league, setLeague] = useState('');
  const [team, setTeam] = useState('');
  const [region, setRegion] = useState('');
  const [page, setPage] = useState(1);

  const sports = useUpcomingSports(
    league || undefined,
    team.trim() || undefined,
    region || undefined,
    page,
  );

  const totalPages = sports.data
    ? Math.ceil(sports.data.total / (sports.data.limit || 20))
    : 1;

  const handleFilterReset = () => {
    setLeague('');
    setTeam('');
    setRegion('');
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Live Sports</h1>
        <p className="mt-1 text-gray-500">Browse upcoming and live sporting events with broadcast info</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={league}
          onChange={(e) => { setLeague(e.target.value); setPage(1); }}
          className="input-base w-auto text-sm"
          aria-label="Filter by league"
        >
          {LEAGUES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <input
          type="text"
          value={team}
          onChange={(e) => { setTeam(e.target.value); setPage(1); }}
          placeholder="Search team…"
          className="input-base w-auto text-sm"
          aria-label="Filter by team"
        />

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

        {(league || team || region) && (
          <button onClick={handleFilterReset} className="btn-ghost text-sm text-gray-500">
            Reset filters
          </button>
        )}
      </div>

      {/* Content */}
      {sports.isPending && <FullPageSpinner />}

      {sports.isError && (
        <ErrorMessage
          error={sports.error}
          title="Could not load sports schedule"
          onRetry={() => sports.refetch()}
        />
      )}

      {!sports.isPending && !sports.isError && sports.data?.items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="font-medium">No upcoming events found</p>
          <p className="text-sm text-gray-400">Try adjusting your filters.</p>
        </div>
      )}

      {sports.data && sports.data.items.length > 0 && (
        <>
          <div className="mb-3 text-sm text-gray-500">
            {sports.data.total} event{sports.data.total !== 1 ? 's' : ''} found
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sports.data.items.map((event) => (
              <SportsEventCard key={event.id} event={event} />
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
        </>
      )}
    </div>
  );
}
