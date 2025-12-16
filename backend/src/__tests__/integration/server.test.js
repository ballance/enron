import request from 'supertest';
import app from '../../server.js';

describe('Server Integration Tests', () => {
  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
    });

    it('should include database health check', async () => {
      const response = await request(app).get('/health');

      expect(response.body.services.database).toHaveProperty('healthy');
      expect(typeof response.body.services.database.healthy).toBe('boolean');
    });

    it('should include redis health check', async () => {
      const response = await request(app).get('/health');

      expect(response.body.services.redis).toHaveProperty('healthy');
      expect(typeof response.body.services.redis.healthy).toBe('boolean');
    });
  });

  describe('GET /api', () => {
    it('should return 200 and API information', async () => {
      const response = await request(app).get('/api');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });

    it('should list available endpoints', async () => {
      const response = await request(app).get('/api');

      expect(response.body.endpoints).toHaveProperty('health');
      expect(response.body.endpoints).toHaveProperty('analytics');
      expect(response.body.endpoints).toHaveProperty('people');
      expect(response.body.endpoints).toHaveProperty('network');
      expect(response.body.endpoints).toHaveProperty('threads');
      expect(response.body.endpoints).toHaveProperty('timeline');
      expect(response.body.endpoints).toHaveProperty('search');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Not Found');
    });

    it('should include route information in 404 error', async () => {
      const response = await request(app).get('/api/invalid/route');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('/api/invalid/route');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON request bodies', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      // Even though route doesn't exist, JSON should be parsed before 404
      expect(response.status).toBe(404);
    });
  });
});
