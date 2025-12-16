import { getPaginationParams, buildPaginationResponse } from '../pagination.js';

describe('Pagination Utilities', () => {
  describe('getPaginationParams', () => {
    it('should return default values when no query params', () => {
      const req = { query: {} };
      const result = getPaginationParams(req);

      expect(result).toEqual({
        page: 1,
        limit: 50,
        offset: 0
      });
    });

    it('should parse page and limit from query params', () => {
      const req = { query: { page: '2', limit: '100' } };
      const result = getPaginationParams(req);

      expect(result).toEqual({
        page: 2,
        limit: 100,
        offset: 100
      });
    });

    it('should enforce maximum limit of 1000', () => {
      const req = { query: { limit: '5000' } };
      const result = getPaginationParams(req);

      expect(result.limit).toBe(1000);
    });

    it('should enforce minimum page of 1', () => {
      const req = { query: { page: '-5' } };
      const result = getPaginationParams(req);

      expect(result.page).toBe(1);
    });

    it('should handle invalid inputs gracefully', () => {
      const req = { query: { page: 'invalid', limit: 'bad' } };
      const result = getPaginationParams(req);

      expect(result).toEqual({
        page: 1,
        limit: 50,
        offset: 0
      });
    });

    it('should calculate correct offset', () => {
      const req = { query: { page: '3', limit: '20' } };
      const result = getPaginationParams(req);

      expect(result.offset).toBe(40); // (3-1) * 20
    });
  });

  describe('buildPaginationResponse', () => {
    it('should build correct pagination metadata', () => {
      const data = [1, 2, 3];
      const total = 100;
      const page = 1;
      const limit = 50;

      const result = buildPaginationResponse(data, total, page, limit);

      expect(result).toEqual({
        data: [1, 2, 3],
        pagination: {
          total: 100,
          page: 1,
          limit: 50,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false
        }
      });
    });

    it('should indicate no next page on last page', () => {
      const data = [1, 2, 3];
      const total = 100;
      const page = 2;
      const limit = 50;

      const result = buildPaginationResponse(data, total, page, limit);

      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it('should handle single page correctly', () => {
      const data = [1, 2, 3];
      const total = 3;
      const page = 1;
      const limit = 50;

      const result = buildPaginationResponse(data, total, page, limit);

      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(false);
    });

    it('should calculate total pages correctly', () => {
      const data = [];
      const total = 99;
      const page = 1;
      const limit = 10;

      const result = buildPaginationResponse(data, total, page, limit);

      expect(result.pagination.totalPages).toBe(10); // Math.ceil(99/10)
    });
  });
});
