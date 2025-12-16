import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

/**
 * Fetch paginated list of people
 */
export function usePeople(page = 1, limit = 20, filters = {}) {
  return useQuery({
    queryKey: ['people', page, limit, filters],
    queryFn: async () => {
      const response = await api.get('/people', {
        params: {
          page,
          limit,
          ...filters
        }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch person by ID
 */
export function usePerson(personId) {
  return useQuery({
    queryKey: ['person', personId],
    queryFn: async () => {
      const response = await api.get(`/people/${personId}`);
      return response.data;
    },
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch person's activity timeline
 */
export function usePersonActivity(personId, granularity = 'week') {
  return useQuery({
    queryKey: ['person-activity', personId, granularity],
    queryFn: async () => {
      const response = await api.get(`/people/${personId}/activity`, {
        params: { granularity }
      });
      return response.data;
    },
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch person's top contacts
 */
export function usePersonContacts(personId, limit = 20) {
  return useQuery({
    queryKey: ['person-contacts', personId, limit],
    queryFn: async () => {
      const response = await api.get(`/people/${personId}/contacts`, {
        params: { limit }
      });
      return response.data;
    },
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch person's threads
 */
export function usePersonThreads(personId, page = 1) {
  return useQuery({
    queryKey: ['person-threads', personId, page],
    queryFn: async () => {
      const response = await api.get(`/people/${personId}/threads`, {
        params: { page, limit: 50 }
      });
      return response.data;
    },
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
  });
}
