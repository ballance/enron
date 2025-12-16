import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import apiClient from '../client';

// Mock axios
vi.mock('axios');

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create axios instance with correct config', () => {
    expect(apiClient.defaults.baseURL).toBeDefined();
    expect(apiClient.defaults.timeout).toBe(30000);
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should have request interceptor', () => {
    expect(apiClient.interceptors.request.handlers.length).toBeGreaterThan(0);
  });

  it('should have response interceptor', () => {
    expect(apiClient.interceptors.response.handlers.length).toBeGreaterThan(0);
  });
});
