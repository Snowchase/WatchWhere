import { Availability, StreamType } from '../../types';

interface AvailabilityBadgeProps {
  availability: Availability;
  compact?: boolean;
}

const streamTypeLabel: Record<StreamType, string> = {
  subscription: 'Streaming',
  rent: 'Rent',
  buy: 'Buy',
  free: 'Free',
  broadcast: 'Live TV',
};

const streamTypeColor: Record<StreamType, string> = {
  subscription: 'bg-green-100 text-green-800 border-green-200',
  rent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  buy: 'bg-blue-100 text-blue-800 border-blue-200',
  free: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  broadcast: 'bg-purple-100 text-purple-800 border-purple-200',
};

function formatPrice(price: number | undefined, streamType: StreamType): string {
  if (streamType === 'subscription' || streamType === 'free' || streamType === 'broadcast') {
    return '';
  }
  if (price == null) return '';
  return ` · $${price.toFixed(2)}`;
}

function daysUntilExpiry(availableUntil?: string): number | null {
  if (!availableUntil) return null;
  const diff = new Date(availableUntil).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function AvailabilityBadge({
  availability,
  compact = false,
}: AvailabilityBadgeProps) {
  const days = daysUntilExpiry(availability.available_until);
  const isExpiringSoon = days !== null && days <= 30 && days >= 0;
  const isExpired = days !== null && days < 0;

  if (isExpired) return null;

  const label = streamTypeLabel[availability.stream_type];
  const colorClass = streamTypeColor[availability.stream_type];
  const priceStr = formatPrice(availability.price, availability.stream_type);

  if (compact) {
    return (
      <a
        href={availability.content_url}
        target="_blank"
        rel="noopener noreferrer"
        title={`${availability.platform} — ${label}${priceStr}`}
        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium transition hover:opacity-80 ${colorClass}`}
      >
        {availability.platform}
      </a>
    );
  }

  return (
    <a
      href={availability.content_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md hover:border-indigo-300"
    >
      {availability.logo_url && (
        <img
          src={availability.logo_url}
          alt={availability.platform}
          className="h-8 w-8 rounded object-contain"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-gray-900 text-sm">
          {availability.platform}
        </p>
        <p className="text-xs text-gray-500">
          {label}
          {priceStr}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className={`rounded border px-2 py-0.5 text-xs font-medium ${colorClass}`}
        >
          {label}
        </span>
        {isExpiringSoon && (
          <span className="text-xs font-medium text-orange-600">
            Leaves in {days}d
          </span>
        )}
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-indigo-500 transition"
      >
        <path
          fillRule="evenodd"
          d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
          clipRule="evenodd"
        />
      </svg>
    </a>
  );
}
