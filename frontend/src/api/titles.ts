import { useQuery } from '@tanstack/react-query';
import apiClient from './client';
import { Title, TitleAvailability } from '../types';

const fetchTitle = async (id: string): Promise<Title> => {
  const { data } = await apiClient.get<Title>(`/titles/${id}`);
  return data;
};

export const useTitle = (id: string | undefined) => {
  return useQuery({
    queryKey: ['title', id],
    queryFn: () => fetchTitle(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10,
  });
};

const fetchTitleAvailability = async (
  id: string,
  region?: string,
): Promise<TitleAvailability> => {
  const { data } = await apiClient.get<TitleAvailability>(
    `/titles/${id}/availability`,
    { params: region ? { region } : undefined },
  );
  return data;
};

export const useTitleAvailability = (
  id: string | undefined,
  region?: string,
) => {
  return useQuery({
    queryKey: ['title-availability', id, region],
    queryFn: () => fetchTitleAvailability(id!, region),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
  });
};
