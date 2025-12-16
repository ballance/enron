import { jest } from '@jest/globals';
import { ApiError, errorHandler, asyncHandler} from '../errorHandler.js';

describe('Error Handler Middleware', () => {
  describe('ApiError', () => {
    it('should create error with statusCode and message', () => {
      const error = new ApiError(404, 'Not found');

      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.name).toBe('ApiError');
    });
  });

  describe('errorHandler', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
      console.error = jest.fn(); // Suppress console output in tests
    });

    it('should handle ApiError with custom status code', () => {
      const error = new ApiError(400, 'Bad request');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: true,
        message: 'Bad request'
      });
    });

    it('should handle generic Error with 500 status', () => {
      const error = new Error('Something went wrong');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: true,
        message: 'Something went wrong'
      });
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Stack trace here';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: 'Test error',
          stack: 'Stack trace here'
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: true,
        message: 'Test error'
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const handler = asyncHandler(mockFn);
      await handler(mockReq, mockRes, mockNext);

      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const handler = asyncHandler(mockFn);
      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors', async () => {
      const error = new Error('Sync error');
      const mockFn = jest.fn(() => {
        throw error;
      });
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const handler = asyncHandler(mockFn);

      // asyncHandler wraps in Promise, so it should catch sync errors too
      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
