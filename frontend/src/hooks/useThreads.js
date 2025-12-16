import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

/**
 * Fetch paginated list of threads
 */
export function useThreads(page = 1, sortBy = 'message_count') {
  return useQuery({
    queryKey: ['threads', page, sortBy],
    queryFn: async () => {
      const response = await api.get('/threads', {
        params: { page, sortBy, limit: 50 }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch thread details by ID
 */
export function useThread(threadId) {
  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      const response = await api.get(`/threads/${threadId}`);
      return response.data;
    },
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch thread tree structure
 */
export function useThreadTree(threadId) {
  return useQuery({
    queryKey: ['thread-tree', threadId],
    queryFn: async () => {
      const response = await api.get(`/threads/${threadId}/tree`);
      return response.data;
    },
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch thread messages
 */
export function useThreadMessages(threadId) {
  return useQuery({
    queryKey: ['thread-messages', threadId],
    queryFn: async () => {
      const response = await api.get(`/threads/${threadId}/messages`);
      return response.data;
    },
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch thread participants
 */
export function useThreadParticipants(threadId) {
  return useQuery({
    queryKey: ['thread-participants', threadId],
    queryFn: async () => {
      const response = await api.get(`/threads/${threadId}/participants`);
      return response.data;
    },
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch mailbox threads for a person
 */
export function useMailboxThreads(personId, view = 'all', page = 1, sortBy = 'end_date') {
  return useQuery({
    queryKey: ['mailbox-threads', personId, view, page, sortBy],
    queryFn: async () => {
      const response = await api.get(`/threads/mailbox/${personId}`, {
        params: { view, page, sortBy, limit: 50 }
      });
      return response.data;
    },
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch mailbox statistics for a person
 */
export function useMailboxStats(personId) {
  return useQuery({
    queryKey: ['mailbox-stats', personId],
    queryFn: async () => {
      const response = await api.get(`/threads/mailbox/${personId}/stats`);
      return response.data;
    },
    enabled: !!personId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
