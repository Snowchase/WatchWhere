import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import apiClient from './client';
import {
  PaginatedResponse,
  WatchlistItem,
  WatchlistUpdatePayload,
} from '../types';
import { useAuthStore } from '../store/useAuthStore';

const QUERY_KEY = ['watchlist'];

const fetchWatchlist = async (): Promise<PaginatedResponse<WatchlistItem>> => {
  const { data } = await apiClient.get<PaginatedResponse<WatchlistItem>>(
    '/watchlist',
  );
  return data;
};

export const useWatchlist = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchWatchlist,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
};

export const useMutateWatchlist = () => {
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: (payload: WatchlistUpdatePayload) =>
      apiClient.post('/watchlist', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const remove = useMutation({
    mutationFn: (titleId: string) =>
      apiClient.delete(`/watchlist/${titleId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const update = useMutation({
    mutationFn: ({
      titleId,
      payload,
    }: {
      titleId: string;
      payload: Partial<WatchlistUpdatePayload>;
    }) =>
      apiClient.put(`/watchlist/${titleId}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return { add, remove, update };
};
