import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DebPublication from '../components/deb/DebPublication';
import { apiService } from '../services/api';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    apiService: {
      ...actual.apiService,
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockPublications = [
  {
    pulp_href: '/pulp/api/v3/publications/deb/apt/1/',
    pulp_created: '2024-01-01T00:00:00Z',
    repository: '/pulp/api/v3/repositories/deb/apt/1/',
    simple: false,
    structured: true,
  },
];

const mockRepositories = [
  {
    pulp_href: '/pulp/api/v3/repositories/deb/apt/1/',
    name: 'deb-repo-1',
  },
];

describe('DebPublication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <DebPublication />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders publications after loading', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/publications/deb/apt/')) {
        return Promise.resolve({ count: 1, next: null, previous: null, results: mockPublications });
      }
      if (url.includes('/repositories/deb/apt/')) {
        return Promise.resolve({ count: 1, next: null, previous: null, results: mockRepositories });
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });

    render(
      <MemoryRouter>
        <DebPublication />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DEB Publications')).toBeInTheDocument();
      expect(screen.getByText('deb-repo-1')).toBeInTheDocument();
    });
  });
});
