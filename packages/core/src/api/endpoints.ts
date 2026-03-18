import { get, post, del } from './client'
import {
  Title,
  TitleAvailability,
  WatchlistItem,
  SportsEvent,
  PaginatedResponse,
  SearchParams,
  BrowseParams,
  SportsParams,
  AuthResponse,
} from '../types'

// ---------------------------------------------------------------------------
// Search & Discovery
// ---------------------------------------------------------------------------

/**
 * Full-text search across titles.
 * @param params  SearchParams (q is required)
 * @param baseURL API base URL (e.g. http://localhost:8000)
 */
export async function searchTitles(
  params: SearchParams,
  baseURL: string,
): Promise<PaginatedResponse<Title>> {
  return get<PaginatedResponse<Title>>(
    '/api/v1/titles/search',
    baseURL,
    params as Record<string, unknown>,
  )
}

/**
 * Fetch a single title by its internal ID.
 */
export async function getTitleById(
  id: string,
  baseURL: string,
): Promise<Title> {
  return get<Title>(`/api/v1/titles/${encodeURIComponent(id)}`, baseURL)
}

/**
 * Fetch streaming availability for a title in a given region.
 */
export async function getTitleAvailability(
  id: string,
  region: string,
  baseURL: string,
): Promise<TitleAvailability> {
  return get<TitleAvailability>(
    `/api/v1/titles/${encodeURIComponent(id)}/availability`,
    baseURL,
    { region },
  )
}

/**
 * Browse/filter the full title catalogue.
 */
export async function browseTitles(
  params: BrowseParams,
  baseURL: string,
): Promise<PaginatedResponse<Title>> {
  return get<PaginatedResponse<Title>>(
    '/api/v1/titles',
    baseURL,
    params as Record<string, unknown>,
  )
}

/**
 * Titles that are leaving a platform soon (within the next 30 days by default).
 */
export async function getLeavingSoon(
  region: string,
  baseURL: string,
  platform?: string,
): Promise<PaginatedResponse<Title>> {
  return get<PaginatedResponse<Title>>(
    '/api/v1/titles/leaving-soon',
    baseURL,
    { region, ...(platform ? { platform } : {}) } as Record<string, unknown>,
  )
}

// ---------------------------------------------------------------------------
// Sports
// ---------------------------------------------------------------------------

/**
 * Retrieve upcoming sports events filtered by region, league, or platform.
 */
export async function getUpcomingSports(
  params: SportsParams,
  baseURL: string,
): Promise<PaginatedResponse<SportsEvent>> {
  return get<PaginatedResponse<SportsEvent>>(
    '/api/v1/sports/events',
    baseURL,
    params as Record<string, unknown>,
  )
}

// ---------------------------------------------------------------------------
// Watchlist  (authenticated)
// ---------------------------------------------------------------------------

/**
 * Get the authenticated user's watchlist.
 */
export async function getWatchlist(
  token: string,
  baseURL: string,
): Promise<WatchlistItem[]> {
  return get<WatchlistItem[]>('/api/v1/watchlist', baseURL, undefined, token)
}

/**
 * Add a title to the authenticated user's watchlist.
 */
export async function addToWatchlist(
  titleId: string,
  token: string,
  baseURL: string,
): Promise<WatchlistItem> {
  return post<WatchlistItem>(
    '/api/v1/watchlist',
    { title_id: titleId },
    baseURL,
    token,
  )
}

/**
 * Remove a title from the authenticated user's watchlist.
 * Returns an empty object on success.
 */
export async function removeFromWatchlist(
  titleId: string,
  token: string,
  baseURL: string,
): Promise<void> {
  return del<void>(
    `/api/v1/watchlist/${encodeURIComponent(titleId)}`,
    baseURL,
    token,
  )
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Log in with email + password. Returns a JWT token and the User object.
 */
export async function loginUser(
  email: string,
  password: string,
  baseURL: string,
): Promise<AuthResponse> {
  return post<AuthResponse>(
    '/api/v1/auth/login',
    { email, password },
    baseURL,
  )
}

/**
 * Register a new user. Returns a JWT token and the newly created User object.
 */
export async function registerUser(
  email: string,
  password: string,
  baseURL: string,
): Promise<AuthResponse> {
  return post<AuthResponse>(
    '/api/v1/auth/register',
    { email, password },
    baseURL,
  )
}
