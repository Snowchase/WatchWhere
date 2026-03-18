import { useQuery } from '@tanstack/react-query';
import apiClient from './client';
import { PaginatedResponse, SportsEvent, SportsParams } from '../types';

const fetchUpcomingSports = async (
  params: SportsParams,
): Promise<PaginatedResponse<SportsEvent>> => {
  const { data } = await apiClient.get<PaginatedResponse<SportsEvent>>(
    '/sports/upcoming',
    { params },
  );
  return data;
};

export const useUpcomingSports = (
  league?: string,
  team?: string,
  region?: string,
  page = 1,
  limit = 20,
) => {
  return useQuery({
    queryKey: ['sports', league, team, region, page],
    queryFn: () => fetchUpcomingSports({ league, team, region, page, limit }),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });
};

const fetchLeavingSoon = async (params: {
  region?: string;
  platform?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<{ title: import('../types').Title; available_until: string; platform: string }>> => {
  const { data } = await apiClient.get('/leaving-soon', { params });
  return data;
};

export const useLeavingSoon = (
  region?: string,
  platform?: string,
  page = 1,
  limit = 20,
) => {
  return useQuery({
    queryKey: ['leaving-soon', region, platform, page],
    queryFn: () => fetchLeavingSoon({ region, platform, page, limit }),
    staleTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev,
  });
};
