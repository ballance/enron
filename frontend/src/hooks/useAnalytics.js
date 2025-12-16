import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

/**
 * Fetch overall statistics
 */
export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/stats');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch top email senders
 * @param {number} limit - Number of results (default: 20)
 */
export const useTopSenders = (limit = 20) => {
  return useQuery({
    queryKey: ['top-senders', limit],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/top-senders?limit=${limit}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch top email receivers
 * @param {number} limit - Number of results (default: 20)
 */
export const useTopReceivers = (limit = 20) => {
  return useQuery({
    queryKey: ['top-receivers', limit],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/top-receivers?limit=${limit}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
