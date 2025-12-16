import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

/**
 * Fetch email volume over time
 */
export const useEmailVolume = (options = {}) => {
  const { granularity = 'day', startDate, endDate } = options;

  return useQuery({
    queryKey: ['timeline', 'volume', granularity, startDate, endDate],
    queryFn: async () => {
      const params = { granularity };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get('/timeline/volume', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Fetch hourly activity data
 */
export const useHourlyActivity = (options = {}) => {
  const { startDate, endDate } = options;

  return useQuery({
    queryKey: ['timeline', 'hourly', startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get('/timeline/hourly', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Fetch daily activity data
 */
export const useDailyActivity = (options = {}) => {
  const { startDate, endDate } = options;

  return useQuery({
    queryKey: ['timeline', 'daily', startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get('/timeline/daily', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Fetch activity heatmap data
 */
export const useActivityHeatmap = (options = {}) => {
  const { startDate, endDate } = options;

  return useQuery({
    queryKey: ['timeline', 'heatmap', startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get('/timeline/heatmap', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
