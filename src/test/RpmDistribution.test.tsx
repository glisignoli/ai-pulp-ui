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

    const mockPublications = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };

    const mockRepositories = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/distributions/')) {
        return Promise.resolve(mockDistributions);
      }
      if (url.includes('/publications/')) {
        return Promise.resolve(mockPublications);
      }
      if (url.includes('/repositories/')) {
        return Promise.resolve(mockRepositories);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });

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
    vi.mocked(apiService.get).mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValue({ count: 0, next: null, previous: null, results: [] });

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

    vi.mocked(apiService.get).mockResolvedValue(emptyResponse);

    renderRpmDistribution();

    await waitFor(() => {
      expect(screen.getByText('No distributions found')).toBeInTheDocument();
    });
  });

  it('opens create dialog', async () => {
    const user = userEvent.setup();
    vi.mocked(apiService.get).mockResolvedValue({
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
    
    const emptyResponse = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
    
    const newDistResponse = {
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
    };

    let callCount = 0;
    vi.mocked(apiService.get).mockImplementation(() => {
      callCount++;
      // First 3 calls: initial load (distributions, publications, repositories)
      // Next 3 calls: after create (distributions, publications, repositories)
      if (callCount <= 3) {
        return Promise.resolve(emptyResponse);
      }
      return Promise.resolve(newDistResponse);
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
    
    const initialResponse = {
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
    };
    
    const emptyResponse = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
    
    let callCount = 0;
    vi.mocked(apiService.get).mockImplementation(() => {
      callCount++;
      // First 3 calls: initial load (distributions, publications, repositories)
      if (callCount === 1) {
        return Promise.resolve(initialResponse);
      }
      return Promise.resolve(emptyResponse);
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
    
    const initialResponse = {
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
    };
    
    const emptyResponse = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
    
    let callCount = 0;
    vi.mocked(apiService.get).mockImplementation(() => {
      callCount++;
      // First 3 calls: initial load (distributions, publications, repositories)
      if (callCount === 1) {
        return Promise.resolve(initialResponse);
      }
      return Promise.resolve(emptyResponse);
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

  it('loads repository versions for selected repository in the dialog', async () => {
    const user = userEvent.setup();

    const emptyDistributions = { count: 0, next: null, previous: null, results: [] };
    const emptyPublications = { count: 0, next: null, previous: null, results: [] };

    const repoHref = '/pulp/api/v3/repositories/rpm/rpm/1/';
    const mockRepositories = {
      count: 1,
      next: null,
      previous: null,
      results: [{ pulp_href: repoHref, name: 'test-repo' }],
    };

    const mockVersions = {
      count: 1,
      next: null,
      previous: null,
      results: [{ pulp_href: `${repoHref}versions/1/`, number: 1, repository: repoHref }],
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/distributions/')) return Promise.resolve(emptyDistributions);
      if (url.includes('/publications/')) return Promise.resolve(emptyPublications);
      if (url === '/repositories/rpm/rpm/') return Promise.resolve(mockRepositories);
      if (url === `${repoHref}versions/`) return Promise.resolve(mockVersions);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });

    renderRpmDistribution();

    await user.click(await screen.findByRole('button', { name: /create distribution/i }));
    const dialog = screen.getByRole('dialog');

    const repoCombobox = within(dialog).getByRole('combobox', { name: /^Repository$/i });
    await user.click(repoCombobox);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'test-repo' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('option', { name: 'test-repo' }));

    await waitFor(() => {
      expect(apiService.get).toHaveBeenCalledWith(`${repoHref}versions/`);
    });

    const versionCombobox = within(dialog).getByRole('combobox', { name: /^Repository Version$/i });
    await user.click(versionCombobox);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Version 1' })).toBeInTheDocument();
    });
  });

  it('submits repository version as a fully-qualified URL', async () => {
    const user = userEvent.setup();

    const emptyDistributions = { count: 0, next: null, previous: null, results: [] };
    const emptyPublications = { count: 0, next: null, previous: null, results: [] };

    const repoHref = '/pulp/api/v3/repositories/rpm/rpm/1/';
    const mockRepositories = {
      count: 1,
      next: null,
      previous: null,
      results: [{ pulp_href: repoHref, name: 'test-repo' }],
    };

    const versionHref = `${repoHref}versions/1/`;
    const mockVersions = {
      count: 1,
      next: null,
      previous: null,
      results: [{ pulp_href: versionHref, number: 1, repository: repoHref }],
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/distributions/')) return Promise.resolve(emptyDistributions);
      if (url.includes('/publications/')) return Promise.resolve(emptyPublications);
      if (url === '/repositories/rpm/rpm/') return Promise.resolve(mockRepositories);
      if (url === `${repoHref}versions/`) return Promise.resolve(mockVersions);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });

    vi.mocked(apiService.post).mockResolvedValueOnce({ task: '/pulp/api/v3/tasks/1/' } as any);

    renderRpmDistribution();

    await user.click(await screen.findByRole('button', { name: /create distribution/i }));
    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText(/name/i), 'new-distribution');
    await user.type(within(dialog).getByLabelText(/base path/i), 'new/path');

    const repoCombobox = within(dialog).getByRole('combobox', { name: /^Repository$/i });
    await user.click(repoCombobox);
    await user.click(await screen.findByRole('option', { name: 'test-repo' }));

    const versionCombobox = within(dialog).getByRole('combobox', { name: /^Repository Version$/i });
    await user.click(versionCombobox);
    await user.click(await screen.findByRole('option', { name: 'Version 1' }));

    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(
        '/distributions/rpm/rpm/',
        expect.objectContaining({
          repository: `http://localhost:8080${versionHref}`,
        })
      );
    });
  });
});
