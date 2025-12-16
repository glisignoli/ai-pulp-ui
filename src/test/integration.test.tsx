import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/pulp/api/v3';

describe('Integration Tests', () => {
  beforeAll(async () => {
    // Wait for backend to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        await axios.get(`${API_BASE_URL}/status/`);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw new Error('Backend not available');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  });

  describe('Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const token = btoa('admin:password');
      
      const response = await axios.get(`${API_BASE_URL}/groups/`, {
        headers: {
          'Authorization': `Basic ${token}`
        }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('count');
      expect(response.data).toHaveProperty('results');
    });

    it('should fail authentication with invalid credentials', async () => {
      const token = btoa('admin:wrongpassword');
      
      try {
        await axios.get(`${API_BASE_URL}/groups/`, {
          headers: {
            'Authorization': `Basic ${token}`
          }
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(401);
        } else {
          throw error;
        }
      }
    });

    it('should fail authentication without credentials', async () => {
      try {
        await axios.get(`${API_BASE_URL}/groups/`);
        expect.fail('Should have thrown an error');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(401);
        } else {
          throw error;
        }
      }
    });
  });

  describe('API Endpoints', () => {
    const authHeader = {
      'Authorization': `Basic ${btoa('admin:password')}`
    };

    it('should fetch status endpoint', async () => {
      const response = await axios.get(`${API_BASE_URL}/status/`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('versions');
      expect(Array.isArray(response.data.versions)).toBe(true);
    });

    it('should fetch RPM distributions', async () => {
      const response = await axios.get(`${API_BASE_URL}/distributions/rpm/rpm/`, {
        headers: authHeader
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('count');
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });

    it('should fetch RPM repositories', async () => {
      const response = await axios.get(`${API_BASE_URL}/repositories/rpm/rpm/`, {
        headers: authHeader
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('count');
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });

    it('should fetch file distributions', async () => {
      const response = await axios.get(`${API_BASE_URL}/distributions/file/file/`, {
        headers: authHeader
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('count');
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });

    it('should fetch deb distributions', async () => {
      const response = await axios.get(`${API_BASE_URL}/distributions/deb/apt/`, {
        headers: authHeader
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('count');
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });

    it('should fetch groups endpoint', async () => {
      const response = await axios.get(`${API_BASE_URL}/groups/`, {
        headers: authHeader
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('count');
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);
    });
  });

  describe('API Service Integration', () => {
    it('should handle API pagination structure', async () => {
      const response = await axios.get(`${API_BASE_URL}/distributions/rpm/rpm/`, {
        headers: {
          'Authorization': `Basic ${btoa('admin:password')}`
        }
      });
      
      expect(response.data).toHaveProperty('count');
      expect(response.data).toHaveProperty('next');
      expect(response.data).toHaveProperty('previous');
      expect(response.data).toHaveProperty('results');
      
      // Verify it's a proper Pulp list response
      expect(typeof response.data.count).toBe('number');
      expect(response.data.next === null || typeof response.data.next === 'string').toBe(true);
      expect(response.data.previous === null || typeof response.data.previous === 'string').toBe(true);
    });
  });
});
