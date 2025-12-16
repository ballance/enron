import { jest } from '@jest/globals';
import { getNetworkGraph, getPersonNetwork } from '../networkService.js';
import pool from '../../config/database.js';

jest.mock('../../config/database.js', () => ({
  default: {
    query: jest.fn()
  }
}));

describe('Network Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNetworkGraph', () => {
    it('should return network graph with nodes and edges', async () => {
      const mockPeople = [
        { id: 1, email: 'person1@enron.com', sent_count: 100, received_count: 50 },
        { id: 2, email: 'person2@enron.com', sent_count: 200, received_count: 75 }
      ];

      const mockEdges = [
        { from_person_id: 1, to_person_id: 2, email_count: 10 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockPeople }) // people query
        .mockResolvedValueOnce({ rows: mockEdges }); // edges query

      const result = await getNetworkGraph();

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0]).toHaveProperty('id');
      expect(result.nodes[0]).toHaveProperty('email');
      expect(result.edges[0]).toHaveProperty('source');
      expect(result.edges[0]).toHaveProperty('target');
      expect(result.edges[0]).toHaveProperty('value');
    });

    it('should apply minEmails filter', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getNetworkGraph({ minEmails: 100 });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('sent_count + received_count >= $1'),
        expect.arrayContaining([100])
      );
    });

    it('should apply limit', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getNetworkGraph({ limit: 50 });

      expect(pool.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('LIMIT $'),
        expect.any(Array)
      );
    });

    it('should enforce maximum limit of 1000', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getNetworkGraph({ limit: 5000 });

      const calls = pool.query.mock.calls[0];
      expect(calls[1]).toContain(1000);
    });
  });

  describe('getPersonNetwork', () => {
    it('should return ego network for a person', async () => {
      const mockPeople = [
        { id: 1, email: 'center@enron.com', sent_count: 100, received_count: 50 },
        { id: 2, email: 'connected@enron.com', sent_count: 50, received_count: 25 }
      ];

      const mockEdges = [
        { from_person_id: 1, to_person_id: 2, email_count: 10 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: mockPeople })
        .mockResolvedValueOnce({ rows: mockEdges });

      const result = await getPersonNetwork(1);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.centerNode).toEqual(mockPeople[0]);
    });

    it('should apply depth filter', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await getPersonNetwork(1, { depth: 2 });

      // Should query for people within 2 hops
      expect(pool.query).toHaveBeenCalled();
    });

    it('should throw error for invalid person ID', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(getPersonNetwork(999)).rejects.toThrow('Person not found');
    });
  });
});
