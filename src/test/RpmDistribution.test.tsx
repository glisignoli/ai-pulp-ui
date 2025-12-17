import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { RpmDistribution } from '../components/rpm/RpmDistribution';
import { apiService } from '../services/api';

vi.mock('../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
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
    // Important: clear any queued mockResolvedValueOnce/mockImplementationOnce
    // between tests. Otherwise a failing test can leak its queued results into
    // the next test.
    vi.mocked(apiService.get).mockReset();
    vi.mocked(apiService.post).mockReset();
    vi.mocked(apiService.put).mockReset();
    vi.mocked(apiService.delete).mockReset();
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
          hidden: false,
          repository: null,
          publication: null,
        },
        {
          pulp_href: '/pulp/api/v3/distributions/rpm/rpm/2/',
          name: 'test-dist-2',
          base_path: 'test/path2',
          content_guard: 'guard1',
          hidden: true,
          repository: '/pulp/api/v3/repositories/rpm/rpm/1/',
          publication: null,
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

  it('opens create dialog', async () => {
    const user = userEvent.setup();
    vi.mocked(apiService.get).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    renderRpmDistribution();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create distribution/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create distribution/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/create distribution/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/name/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/base path/i)).toBeInTheDocument();
  });

  it('submits create distribution', async () => {
    const user = userEvent.setup();
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            pulp_href: '/pulp/api/v3/distributions/rpm/rpm/1/',
            name: 'new-distribution',
            base_path: 'new/path',
            content_guard: null,
            hidden: false,
            repository: null,
            publication: null,
          },
        ],
      });
    vi.mocked(apiService.post).mockResolvedValueOnce({ task: '/pulp/api/v3/tasks/1/' } as any);

    renderRpmDistribution();

    await user.click(await screen.findByRole('button', { name: /create distribution/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/name/i), 'new-distribution');
    await user.type(within(dialog).getByLabelText(/base path/i), 'new/path');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/distributions/rpm/rpm/', expect.any(Object));
    });
  });

  it('opens edit dialog and submits update', async () => {
    const user = userEvent.setup();
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            pulp_href: '/pulp/api/v3/distributions/rpm/rpm/1/',
            name: 'test-distribution',
            base_path: 'test/path',
            content_guard: null,
            hidden: true,
            repository: '/pulp/api/v3/repositories/rpm/rpm/1/',
            publication: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            pulp_href: '/pulp/api/v3/distributions/rpm/rpm/1/',
            name: 'test-distribution',
            base_path: 'updated/path',
            content_guard: null,
            hidden: true,
            repository: '/pulp/api/v3/repositories/rpm/rpm/1/',
            publication: null,
          },
        ],
      });
    vi.mocked(apiService.put).mockResolvedValueOnce({} as any);

    renderRpmDistribution();

    expect(await screen.findByText('test-distribution')).toBeInTheDocument();

    await user.click(screen.getAllByTitle('Edit')[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/edit distribution/i)).toBeInTheDocument();

    const basePath = within(dialog).getByLabelText(/base path/i);
    await user.clear(basePath);
    await user.type(basePath, 'updated/path');
    await user.click(within(dialog).getByRole('button', { name: /^update$/i }));

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith(
        '/pulp/api/v3/distributions/rpm/rpm/1/',
        expect.any(Object)
      );
    });
  });

  it('submits delete distribution', async () => {
    const user = userEvent.setup();
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            pulp_href: '/pulp/api/v3/distributions/rpm/rpm/1/',
            name: 'test-distribution',
            base_path: 'test/path',
            content_guard: null,
            hidden: false,
            repository: null,
            publication: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });
    vi.mocked(apiService.delete).mockResolvedValueOnce({ task: '/pulp/api/v3/tasks/2/' } as any);

    renderRpmDistribution();

    expect(await screen.findByText('test-distribution')).toBeInTheDocument();

    await user.click(screen.getAllByTitle('Delete')[0]);
    expect(screen.getByText(/confirm delete/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith('/pulp/api/v3/distributions/rpm/rpm/1/');
    });
  });
});
