import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('backend health endpoint should be accessible', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('services');
    expect(body.services).toHaveProperty('database');
    expect(body.services).toHaveProperty('redis');
  });

  test('backend API info endpoint should be accessible', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('endpoints');
  });

  test('database should be healthy', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');
    const body = await response.json();

    expect(body.services.database.healthy).toBe(true);
  });

  test('redis should be healthy', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');
    const body = await response.json();

    expect(body.services.redis.healthy).toBe(true);
  });
});
