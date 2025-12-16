import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

/**
 * Fetch network graph data
 */
export const useNetworkGraph = (filters = {}) => {
  const { minEmails = 5, limit = 500 } = filters;

  return useQuery({
    queryKey: ['network', 'graph', minEmails, limit],
    queryFn: async () => {
      const response = await apiClient.get('/network/graph', {
        params: { minEmails, limit }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Fetch person's ego network
 */
export const usePersonNetwork = (personId, options = {}) => {
  const { depth = 1, minEmails = 1 } = options;

  return useQuery({
    queryKey: ['network', 'person', personId, depth, minEmails],
    queryFn: async () => {
      const response = await apiClient.get(`/network/person/${personId}`, {
        params: { depth, minEmails }
      });
      return response.data;
    },
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
