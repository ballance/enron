import { jest } from '@jest/globals';
import { getPeople, getPersonById } from '../peopleService.js';
import pool from '../../config/database.js';

jest.mock('../../config/database.js', () => ({
  default: {
    query: jest.fn()
  }
}));

describe('People Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPeople', () => {
    it('should return paginated people', async () => {
      const mockPeople = [
        { id: 1, email: 'test1@enron.com', sent_count: 100, received_count: 50 },
        { id: 2, email: 'test2@enron.com', sent_count: 200, received_count: 75 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '1000' }] }) // total count
        .mockResolvedValueOnce({ rows: mockPeople }); // data

      const result = await getPeople(1, 50);

      expect(result.data).toEqual(mockPeople);
      expect(result.total).toBe(1000);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should apply filters', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getPeople(1, 50, { minSent: 100 });

      expect(pool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('WHERE sent_count >= $3'),
        expect.any(Array)
      );
    });

    it('should sort by different fields', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getPeople(1, 50, { sortBy: 'received_count' });

      expect(pool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('ORDER BY received_count DESC'),
        expect.any(Array)
      );
    });
  });

  describe('getPersonById', () => {
    it('should return person details', async () => {
      const mockPerson = {
        id: 1,
        email: 'test@enron.com',
        sent_count: 100,
        received_count: 50
      };

      pool.query.mockResolvedValue({ rows: [mockPerson] });

      const result = await getPersonById(1);

      expect(result).toEqual(mockPerson);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [1]
      );
    });

    it('should return null for non-existent person', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await getPersonById(999);

      expect(result).toBeNull();
    });
  });
});
