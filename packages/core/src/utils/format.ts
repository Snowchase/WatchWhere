import { StreamType } from '../types'

// ---------------------------------------------------------------------------
// Stream type
// ---------------------------------------------------------------------------

const STREAM_TYPE_LABELS: Record<StreamType, string> = {
  subscription: 'Subscription',
  rent: 'Rent',
  buy: 'Buy',
  free: 'Free',
  broadcast: 'Broadcast',
}

/**
 * Returns a human-readable label for a StreamType value.
 *
 * @example
 * formatStreamType('subscription') // → 'Subscription'
 * formatStreamType('rent')         // → 'Rent'
 */
export function formatStreamType(type: StreamType): string {
  return STREAM_TYPE_LABELS[type] ?? type
}

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

/**
 * Formats an optional price value as a dollar string.
 * Returns 'Included' when the price is undefined or zero (subscription/free).
 *
 * @example
 * formatPrice(3.99)    // → '$3.99'
 * formatPrice(0)       // → 'Included'
 * formatPrice()        // → 'Included'
 */
export function formatPrice(price?: number): string {
  if (price == null || price === 0) return 'Included'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

// ---------------------------------------------------------------------------
// Availability dates
// ---------------------------------------------------------------------------

/**
 * Returns a short "Leaves <Month> <Day>" label from an ISO date string.
 * Returns an empty string when the date is not provided.
 *
 * @example
 * formatAvailableUntil('2025-04-15') // → 'Leaves Apr 15'
 * formatAvailableUntil(undefined)    // → ''
 */
export function formatAvailableUntil(date?: string): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  return `Leaves ${month} ${day}`
}

/**
 * Formats an ISO datetime string into a localised, human-friendly event time.
 * Uses the user's local timezone automatically via the Intl API.
 *
 * @example
 * formatEventTime('2025-06-01T19:30:00Z')
 * // → 'Sun, Jun 1 · 7:30 PM' (locale-dependent)
 */
export function formatEventTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso

  const weekday = d.toLocaleString('en-US', { weekday: 'short' })
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const time = d.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `${weekday}, ${month} ${day} · ${time}`
}

// ---------------------------------------------------------------------------
// Leaving-soon helper
// ---------------------------------------------------------------------------

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Returns true when the given ISO date is within the next 30 days.
 * Returns false when the date is undefined, invalid, or already in the past.
 *
 * @example
 * isLeavingSoon('2025-04-01') // → true / false depending on current date
 * isLeavingSoon(undefined)    // → false
 */
export function isLeavingSoon(available_until?: string): boolean {
  if (!available_until) return false
  const until = new Date(available_until)
  if (isNaN(until.getTime())) return false
  const now = Date.now()
  const diff = until.getTime() - now
  return diff > 0 && diff <= THIRTY_DAYS_MS
}
