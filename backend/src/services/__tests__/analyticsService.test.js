import { jest } from '@jest/globals';
import { getOverallStats, getTopSenders, getTopReceivers } from '../analyticsService.js';
import pool from '../../config/database.js';

// Mock the database
jest.mock('../../config/database.js', () => ({
  default: {
    query: jest.fn()
  }
}));

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverallStats', () => {
    it('should return overall statistics', async () => {
      // Mock database responses
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '87402' }] }) // people count
        .mockResolvedValueOnce({ rows: [{ count: '517401' }] }) // messages count
        .mockResolvedValueOnce({ rows: [{ count: '127144' }] }) // threads count
        .mockResolvedValueOnce({ rows: [{ min: '1998-11-13', max: '2002-06-21' }] }); // date range

      const stats = await getOverallStats();

      expect(stats).toEqual({
        totalPeople: 87402,
        totalMessages: 517401,
        totalThreads: 127144,
        dateRange: {
          earliest: '1998-11-13',
          latest: '2002-06-21'
        }
      });

      expect(pool.query).toHaveBeenCalledTimes(4);
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      await expect(getOverallStats()).rejects.toThrow('Database error');
    });
  });

  describe('getTopSenders', () => {
    it('should return top senders with default limit', async () => {
      const mockData = [
        { email: 'jeff.dasovich@enron.com', sent_count: 28465, received_count: 4021 },
        { email: 'sara.shackleton@enron.com', sent_count: 18898, received_count: 2542 }
      ];

      pool.query.mockResolvedValue({ rows: mockData });

      const result = await getTopSenders();

      expect(result).toEqual(mockData);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY sent_count DESC'),
        [20]
      );
    });

    it('should return top senders with custom limit', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await getTopSenders(10);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [10]
      );
    });

    it('should enforce maximum limit of 100', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await getTopSenders(500);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [100]
      );
    });
  });

  describe('getTopReceivers', () => {
    it('should return top receivers with default limit', async () => {
      const mockData = [
        { email: 'jeff.dasovich@enron.com', received_count: 11841, sent_count: 5496 },
        { email: 'sara.shackleton@enron.com', received_count: 10285, sent_count: 3055 }
      ];

      pool.query.mockResolvedValue({ rows: mockData });

      const result = await getTopReceivers();

      expect(result).toEqual(mockData);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY received_count DESC'),
        [20]
      );
    });

    it('should return top receivers with custom limit', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await getTopReceivers(15);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [15]
      );
    });
  });
});
