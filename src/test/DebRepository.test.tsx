import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DebRepository } from '../components/deb/DebRepository';
import { apiService } from '../services/api';

vi.mock('../services/api');

const mockRepositories = [
  {
    pulp_href: '/pulp/api/v3/repositories/deb/apt/1/',
    name: 'deb-repo-1',
    description: 'Test deb repo',
    retain_repo_versions: 3,
  },
];

describe('DebRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <DebRepository />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders repositories after loading', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/repositories/deb/apt/')) {
        return Promise.resolve({ count: 1, next: null, previous: null, results: mockRepositories });
      }
      if (url.includes('/remotes/deb/apt/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });

    render(
      <MemoryRouter>
        <DebRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DEB Repositories')).toBeInTheDocument();
      expect(screen.getByText('deb-repo-1')).toBeInTheDocument();
      expect(screen.getByText('Test deb repo')).toBeInTheDocument();
    });
  });
});
