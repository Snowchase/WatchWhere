import { useQuery } from '@tanstack/react-query';
import apiClient from './client';
import { PaginatedResponse, SearchParams, Title } from '../types';

const fetchSearch = async (params: SearchParams): Promise<PaginatedResponse<Title>> => {
  const { data } = await apiClient.get<PaginatedResponse<Title>>('/search', { params });
  return data;
};

export const useSearch = (
  q: string,
  type?: SearchParams['type'],
  region?: string,
  page = 1,
  limit = 20,
) => {
  return useQuery({
    queryKey: ['search', q, type, region, page, limit],
    queryFn: () => fetchSearch({ q, type, region, page, limit }),
    enabled: q.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (prev) => prev,
  });
};

const fetchBrowse = async (params: {
  type?: string;
  genre?: string;
  platform?: string;
  region?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Title>> => {
  const { data } = await apiClient.get<PaginatedResponse<Title>>('/browse', { params });
  return data;
};

export const useBrowse = (
  type?: string,
  genre?: string,
  platform?: string,
  region?: string,
  page = 1,
  limit = 20,
) => {
  return useQuery({
    queryKey: ['browse', type, genre, platform, region, page],
    queryFn: () => fetchBrowse({ type, genre, platform, region, page, limit }),
    staleTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev,
  });
};
