import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Set test timeout to 10 seconds
vi.setConfig({ testTimeout: 10000 });

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
