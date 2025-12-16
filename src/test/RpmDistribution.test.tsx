import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RpmDistribution } from '../components/rpm/RpmDistribution';
import { apiService } from '../services/api';

vi.mock('../services/api', () => ({
  apiService: {
    get: vi.fn(),
  },
}));

const renderRpmDistribution = () => {
  return render(
    <BrowserRouter>
      <RpmDistribution />
    </BrowserRouter>
  );
};

describe('RpmDistribution Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));
    
    renderRpmDistribution();
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders distributions table when data is loaded', async () => {
    const mockDistributions = {
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/distributions/rpm/rpm/1/',
          name: 'test-dist-1',
          base_path: 'test/path1',
          content_guard: null,
        },
        {
          pulp_href: '/pulp/api/v3/distributions/rpm/rpm/2/',
          name: 'test-dist-2',
          base_path: 'test/path2',
          content_guard: 'guard1',
        },
      ],
    };

    vi.mocked(apiService.get).mockResolvedValueOnce(mockDistributions);

    renderRpmDistribution();

    await waitFor(() => {
      expect(screen.getByText('RPM Distributions')).toBeInTheDocument();
      expect(screen.getByText('test-dist-1')).toBeInTheDocument();
      expect(screen.getByText('test-dist-2')).toBeInTheDocument();
      expect(screen.getByText('test/path1')).toBeInTheDocument();
      expect(screen.getByText('test/path2')).toBeInTheDocument();
    });
  });

  it('renders error message on API failure', async () => {
    vi.mocked(apiService.get).mockRejectedValueOnce(new Error('API Error'));

    renderRpmDistribution();

    await waitFor(() => {
      expect(screen.getByText(/failed to load distributions/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no distributions exist', async () => {
    const emptyResponse = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };

    vi.mocked(apiService.get).mockResolvedValueOnce(emptyResponse);

    renderRpmDistribution();

    await waitFor(() => {
      expect(screen.getByText('No distributions found')).toBeInTheDocument();
    });
  });
});
