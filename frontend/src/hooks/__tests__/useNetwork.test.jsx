import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNetworkGraph, usePersonNetwork } from '../useNetwork';
import apiClient from '../../api/client';
import React from 'react';

vi.mock('../../api/client');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useNetwork hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useNetworkGraph', () => {
    it('should fetch network graph data with default filters', async () => {
      const mockData = {
        nodes: [
          { id: 1, email: 'test@enron.com', sentCount: 100, receivedCount: 50 }
        ],
        edges: [
          { source: 1, target: 2, value: 10 }
        ],
        stats: { nodeCount: 1, edgeCount: 1 }
      };

      apiClient.get.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useNetworkGraph(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith('/network/graph', {
        params: { minEmails: 5, limit: 500 }
      });
      expect(result.current.data).toEqual(mockData);
    });

    it('should fetch network graph data with custom filters', async () => {
      const mockData = { nodes: [], edges: [], stats: { nodeCount: 0, edgeCount: 0 } };
      apiClient.get.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useNetworkGraph({ minEmails: 10, limit: 100 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith('/network/graph', {
        params: { minEmails: 10, limit: 100 }
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNetworkGraph(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('usePersonNetwork', () => {
    it('should fetch person network data', async () => {
      const mockData = {
        nodes: [
          { id: 1, email: 'test@enron.com', isCenter: true }
        ],
        edges: [],
        centerNode: { id: 1, email: 'test@enron.com' }
      };

      apiClient.get.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => usePersonNetwork(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith('/network/person/1', {
        params: { depth: 1, minEmails: 1 }
      });
      expect(result.current.data).toEqual(mockData);
    });

    it('should not fetch when personId is null', () => {
      const { result } = renderHook(() => usePersonNetwork(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should fetch with custom options', async () => {
      const mockData = { nodes: [], edges: [], centerNode: null };
      apiClient.get.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(
        () => usePersonNetwork(1, { depth: 2, minEmails: 5 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.get).toHaveBeenCalledWith('/network/person/1', {
        params: { depth: 2, minEmails: 5 }
      });
    });
  });
});
