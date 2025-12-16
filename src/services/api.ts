import axios from 'axios';

const API_BASE_URL = '/pulp/api/v3';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  username: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
    if (this.token) {
      this.setAuthToken(this.token);
    }
  }

  private setAuthToken(token: string) {
    this.token = token;
    axios.defaults.headers.common['Authorization'] = `Basic ${token}`;
  }

  private clearAuthToken() {
    this.token = null;
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
  }

  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const token = btoa(`${credentials.username}:${credentials.password}`);
      
      console.log('Attempting login to:', `${API_BASE_URL}/groups/`);
      
      // Test authentication by calling groups endpoint
      const response = await axios.get(`${API_BASE_URL}/groups/`, {
        headers: {
          'Authorization': `Basic ${token}`
        }
      });

      if (response.status === 200) {
        this.setAuthToken(token);
        localStorage.setItem('authToken', token);
        console.log('Login successful');
        return { username: credentials.username };
      }
      
      throw new Error('Authentication failed');
    } catch (error) {
      console.error('Login error:', error);
      this.clearAuthToken();
      
      if (axios.isAxiosError(error)) {
        // Check for HTTP response errors first
        if (error.response?.status === 401) {
          throw new Error('Invalid username or password');
        }
        if (error.response) {
          throw new Error(`Server error: ${error.response.status}`);
        }
        // Network errors (no response received)
        if (error.code === 'ERR_NETWORK' || !error.response) {
          throw new Error('Cannot connect to Pulp server. Please check if the backend is running.');
        }
        if (error.message.includes('CORS')) {
          throw new Error('CORS error - check browser console for details');
        }
      }
      
      throw new Error('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  logout() {
    this.clearAuthToken();
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  async get<T>(endpoint: string): Promise<T> {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.clearAuthToken();
        window.location.href = '/login';
      }
      throw error;
    }
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.clearAuthToken();
        window.location.href = '/login';
      }
      throw error;
    }
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await axios.put(`${API_BASE_URL}${endpoint}`, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.clearAuthToken();
        window.location.href = '/login';
      }
      throw error;
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await axios.delete(`${API_BASE_URL}${endpoint}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.clearAuthToken();
        window.location.href = '/login';
      }
      throw error;
    }
  }
}

export const apiService = new ApiService();
