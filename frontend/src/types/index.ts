// ─── Enums ────────────────────────────────────────────────────────────────────

export type ContentType = 'movie' | 'tv_show' | 'anime' | 'sport';
export type StreamType = 'subscription' | 'rent' | 'buy' | 'free' | 'broadcast';
export type PlatformType = 'streaming' | 'cable' | 'broadcast' | 'sports';

// ─── Core Entities ─────────────────────────────────────────────────────────────

export interface Title {
  id: string;
  title: string;
  type: ContentType;
  tmdb_id?: number;
  mal_id?: number;
  year?: number;
  genres: string[];
  description?: string;
  poster_url?: string;
  imdb_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Platform {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  base_url?: string;
  type: PlatformType;
  is_free: boolean;
}

export interface Availability {
  platform: string;
  platform_slug: string;
  logo_url?: string;
  stream_type: StreamType;
  content_url: string;
  price?: number;
  available_from?: string;
  available_until?: string;
  last_verified: string;
}

export interface TitleAvailability {
  title_id: string;
  title: string;
  region: string;
  last_updated: string;
  availability: Availability[];
}

export interface User {
  id: string;
  email: string;
  region: string;
  subscriptions: string[];
  notify_email: boolean;
  notify_push: boolean;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  title: Title;
  added_at: string;
  alert_on_add: boolean;
  alert_on_remove: boolean;
}

export interface SportsEvent {
  id: string;
  title_id: string;
  league: string;
  home_team: string;
  away_team: string;
  event_time: string;
  broadcast_ids: string[];
  external_event_id?: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface SearchParams {
  q: string;
  type?: ContentType;
  region?: string;
  page?: number;
  limit?: number;
}

export interface BrowseParams {
  type?: ContentType;
  genre?: string;
  platform?: string;
  region?: string;
  page?: number;
  limit?: number;
}

export interface LeavingSoonParams {
  region?: string;
  platform?: string;
  page?: number;
  limit?: number;
}

export interface SportsParams {
  league?: string;
  team?: string;
  region?: string;
  page?: number;
  limit?: number;
}

export interface WatchlistUpdatePayload {
  title_id: string;
  alert_on_add?: boolean;
  alert_on_remove?: boolean;
}
