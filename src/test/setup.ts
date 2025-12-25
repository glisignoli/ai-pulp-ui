import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Timeouts are configured in Vitest config / CLI

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
