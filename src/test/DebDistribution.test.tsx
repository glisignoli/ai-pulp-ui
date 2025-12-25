import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DebDistribution } from '../components/deb/DebDistribution';
import { apiService } from '../services/api';

vi.mock('../services/api');

const mockDistributions = [
  {
    pulp_href: '/pulp/api/v3/distributions/deb/apt/1/',
    name: 'deb-dist-1',
    base_path: 'deb/dist/1',
    hidden: false,
  },
];

describe('DebDistribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <DebDistribution />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders distributions after loading', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/distributions/deb/apt/')) {
        return Promise.resolve({ count: 1, next: null, previous: null, results: mockDistributions });
      }
      if (url.includes('/publications/deb/apt/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('/repositories/deb/apt/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });

    render(
      <MemoryRouter>
        <DebDistribution />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DEB Distributions')).toBeInTheDocument();
      expect(screen.getByText('deb-dist-1')).toBeInTheDocument();
      expect(screen.getByText('deb/dist/1')).toBeInTheDocument();
    });
  });
});
