import { jest } from '@jest/globals';
import {
  getEmailVolume,
  getHourlyActivity,
  getDailyActivity,
  getActivityHeatmap
} from '../timelineService.js';
import pool from '../../config/database.js';

jest.mock('../../config/database.js', () => ({
  default: {
    query: jest.fn()
  }
}));

describe('Timeline Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmailVolume', () => {
    it('should return email volume grouped by day', async () => {
      const mockData = [
        { date: '2001-01-01', count: 150 },
        { date: '2001-01-02', count: 200 }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await getEmailVolume({ granularity: 'day' });

      expect(result).toEqual(mockData);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("DATE(date)"),
        expect.any(Array)
      );
    });

    it('should apply date range filters', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await getEmailVolume({
        granularity: 'day',
        startDate: '2001-01-01',
        endDate: '2001-12-31'
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("date >= $1 AND date <= $2"),
        ['2001-01-01', '2001-12-31']
      );
    });

    it('should group by week when granularity is week', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await getEmailVolume({ granularity: 'week' });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("DATE_TRUNC('week', date)"),
        expect.any(Array)
      );
    });

    it('should group by month when granularity is month', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await getEmailVolume({ granularity: 'month' });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("DATE_TRUNC('month', date)"),
        expect.any(Array)
      );
    });
  });

  describe('getHourlyActivity', () => {
    it('should return activity grouped by hour (0-23)', async () => {
      const mockData = [
        { hour: 0, count: 10 },
        { hour: 1, count: 5 },
        { hour: 23, count: 20 }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await getHourlyActivity();

      expect(result).toHaveLength(24);
      expect(result[0]).toHaveProperty('hour');
      expect(result[0]).toHaveProperty('count');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("EXTRACT(HOUR FROM date)"),
        expect.any(Array)
      );
    });

    it('should fill missing hours with zero counts', async () => {
      const mockData = [
        { hour: 9, count: 100 },
        { hour: 10, count: 150 }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await getHourlyActivity();

      expect(result).toHaveLength(24);
      expect(result[0].count).toBe(0); // hour 0 should be 0
      expect(result[9].count).toBe(100); // hour 9 should be 100
      expect(result[23].count).toBe(0); // hour 23 should be 0
    });
  });

  describe('getDailyActivity', () => {
    it('should return activity grouped by day of week (0-6)', async () => {
      const mockData = [
        { day: 0, count: 1000 }, // Sunday
        { day: 1, count: 2000 }, // Monday
        { day: 6, count: 500 }   // Saturday
      ];

      pool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await getDailyActivity();

      expect(result).toHaveLength(7);
      expect(result[0]).toHaveProperty('day');
      expect(result[0]).toHaveProperty('dayName');
      expect(result[0]).toHaveProperty('count');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("EXTRACT(DOW FROM date)"),
        expect.any(Array)
      );
    });

    it('should include day names', async () => {
      const mockData = [{ day: 0, count: 100 }];
      pool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await getDailyActivity();

      expect(result[0].dayName).toBe('Sunday');
      expect(result[1].dayName).toBe('Monday');
      expect(result[6].dayName).toBe('Saturday');
    });

    it('should fill missing days with zero counts', async () => {
      const mockData = [
        { day: 1, count: 100 } // Only Monday
      ];

      pool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await getDailyActivity();

      expect(result).toHaveLength(7);
      expect(result[0].count).toBe(0); // Sunday
      expect(result[1].count).toBe(100); // Monday
      expect(result[6].count).toBe(0); // Saturday
    });
  });

  describe('getActivityHeatmap', () => {
    it('should return 24x7 matrix of email counts', async () => {
      const mockData = [
        { hour: 9, day: 1, count: 150 },  // 9 AM Monday
        { hour: 14, day: 3, count: 200 }  // 2 PM Wednesday
      ];

      pool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await getActivityHeatmap();

      expect(result).toHaveLength(24 * 7); // 168 entries
      expect(result[0]).toHaveProperty('hour');
      expect(result[0]).toHaveProperty('day');
      expect(result[0]).toHaveProperty('dayName');
      expect(result[0]).toHaveProperty('count');
    });

    it('should fill all hour-day combinations with counts', async () => {
      const mockData = [
        { hour: 10, day: 2, count: 100 }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await getActivityHeatmap();

      // Find the specific entry
      const entry = result.find(r => r.hour === 10 && r.day === 2);
      expect(entry.count).toBe(100);

      // Check that other entries have 0
      const otherEntry = result.find(r => r.hour === 0 && r.day === 0);
      expect(otherEntry.count).toBe(0);
    });

    it('should apply date range filters', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await getActivityHeatmap({
        startDate: '2001-01-01',
        endDate: '2001-12-31'
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("date >= $1 AND date <= $2"),
        ['2001-01-01', '2001-12-31']
      );
    });
  });
});
