import axios from 'axios';

const API_PATH = '/pulp/api/v3';

export const getPulpApiErrorPayload = (error: unknown): unknown | undefined => {
  if (!axios.isAxiosError(error)) return undefined;
  return error.response?.data;
};

const stringifyUnknown = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const formatPulpApiError = (error: unknown, fallbackMessage: string): string => {
  const payload = getPulpApiErrorPayload(error);

  // Prefer the raw API response body if present.
  if (payload !== undefined && payload !== null && stringifyUnknown(payload).trim() !== '') {
    return stringifyUnknown(payload);
  }

  if (axios.isAxiosError(error)) {
    // Network / CORS / no-response situations
    const message = (error.message || '').trim();
    if (message) return message;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallbackMessage;
};

const enhanceAxiosErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) return;
  const payload = error.response?.data;
  if (payload === undefined) return;

  const payloadString = stringifyUnknown(payload).trim();
  if (!payloadString) return;

  // Mutate the axios error so callers that use `error.message` automatically
  // surface the Pulp API error body.
  error.message = payloadString;
};

const normalizeBackendOrigin = (backend: string) => backend.replace(/\/+$/, '');

const getConfiguredBackendOrigin = (): string | null => {
  const backend = (import.meta.env.PULP_BACKEND as string | undefined)?.trim();
  if (!backend) return null;

  // Allow either an origin (http://host:port) or a full API root.
  // If a full API root was provided, strip the API path back down to the origin.
  const withoutTrailingSlash = normalizeBackendOrigin(backend);
  const apiPathNoSlash = API_PATH.replace(/\/+$/, '');

  if (
    withoutTrailingSlash.endsWith(apiPathNoSlash) ||
    withoutTrailingSlash.endsWith(`${apiPathNoSlash}/`)
  ) {
    return withoutTrailingSlash.slice(0, withoutTrailingSlash.length - apiPathNoSlash.length);
  }

  return withoutTrailingSlash;
};

const getApiRoot = (): string => {
  const origin = getConfiguredBackendOrigin();
  if (!origin) return API_PATH;
  return `${origin}${API_PATH}`;
};

const buildApiUrl = (endpoint: string) => {
  const apiRoot = getApiRoot();

  // Accept full URLs, full API paths, or API-relative endpoints.
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  // If the caller gives a full API path, return it (relative mode) or
  // prefix it with the configured backend origin (absolute mode).
  if (endpoint.startsWith(API_PATH)) {
    if (apiRoot === API_PATH) return endpoint;
    const origin = getConfiguredBackendOrigin();
    if (!origin) return endpoint;
    return `${origin}${endpoint}`;
  }

  if (endpoint.startsWith('/')) {
    return `${apiRoot}${endpoint}`;
  }

  return `${apiRoot}/${endpoint}`;
};

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
      
      console.log('Attempting login to:', buildApiUrl('/groups/'));
      
      // Test authentication by calling groups endpoint
      const response = await axios.get(buildApiUrl('/groups/'), {
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
      const response = await axios.get(buildApiUrl(endpoint));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.clearAuthToken();
        window.location.href = '/login';
      }

      enhanceAxiosErrorMessage(error);
      throw error;
    }
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await axios.post(buildApiUrl(endpoint), data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.clearAuthToken();
        window.location.href = '/login';
      }

      enhanceAxiosErrorMessage(error);
      throw error;
    }
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await axios.put(buildApiUrl(endpoint), data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.clearAuthToken();
        window.location.href = '/login';
      }

      enhanceAxiosErrorMessage(error);
      throw error;
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await axios.delete(buildApiUrl(endpoint));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.clearAuthToken();
        window.location.href = '/login';
      }

      enhanceAxiosErrorMessage(error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
