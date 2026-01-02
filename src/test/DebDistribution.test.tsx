import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DebDistribution } from '../components/deb/DebDistribution';
import { apiService } from '../services/api';

import userEvent from '@testing-library/user-event';

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

  it('submits create distribution with pulp_labels when provided', async () => {
    const user = userEvent.setup();

    const emptyResponse = { count: 0, next: null, previous: null, results: [] };
    const newDistResponse = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/distributions/deb/apt/1/',
          name: 'new-deb-dist',
          base_path: 'deb/new/path',
          hidden: false,
        },
      ],
    };

    let callCount = 0;
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      callCount++;
      // First 3 calls: initial load (distributions, publications, repositories)
      // Next 3 calls: after create (distributions, publications, repositories)
      if (callCount <= 3) return Promise.resolve(emptyResponse);

      if (url.includes('/distributions/deb/apt/')) return Promise.resolve(newDistResponse);
      return Promise.resolve(emptyResponse);
    });

    vi.mocked(apiService.post).mockResolvedValueOnce({ task: '/pulp/api/v3/tasks/1/' } as any);

    render(
      <MemoryRouter>
        <DebDistribution />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: /create distribution/i }));
    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText(/name/i), 'new-deb-dist');
    await user.type(within(dialog).getByLabelText(/base path/i), 'deb/new/path');
    const pulpLabelsInput = within(dialog).getByLabelText(/pulp labels/i);
    fireEvent.change(pulpLabelsInput, {
      target: { value: '{"env":"dev"}' },
    });
    fireEvent.blur(pulpLabelsInput);

    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(
      () => {
      expect(apiService.post).toHaveBeenCalledWith(
        '/distributions/deb/apt/',
        expect.objectContaining({
          pulp_labels: { env: 'dev' },
        })
      );
      },
      { timeout: 5000 }
    );
  }, 20000);

  it('prevents submit when pulp_labels JSON is invalid', async () => {
    const user = userEvent.setup();

    vi.mocked(apiService.get).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });

    render(
      <MemoryRouter>
        <DebDistribution />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: /create distribution/i }));
    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText(/name/i), 'new-deb-dist');
    await user.type(within(dialog).getByLabelText(/base path/i), 'deb/new/path');
    fireEvent.change(within(dialog).getByLabelText(/pulp labels/i), {
      target: { value: '{"k": 1}' },
    });

    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid pulp_labels json/i)).toBeInTheDocument();
    });
    expect(apiService.post).not.toHaveBeenCalled();
  }, 20000);

  it('requests distributions with ordering and pagination params', async () => {
    const user = userEvent.setup();

    // Use count > pageSize (25) so the "next page" button is enabled.
    const emptyResponse = { count: 26, next: null, previous: null, results: [] };
    vi.mocked(apiService.get).mockResolvedValue(emptyResponse);

    render(
      <MemoryRouter>
        <DebDistribution />
      </MemoryRouter>
    );

    await screen.findByText('DEB Distributions');

    await user.click(screen.getByLabelText(/go to next page/i));
    await waitFor(() => {
      const calledWithOffset25 = vi
        .mocked(apiService.get)
        .mock.calls.some(
          ([url]) =>
            typeof url === 'string' &&
            url.includes('/distributions/deb/apt/') &&
            url.includes('limit=25') &&
            url.includes('offset=25')
        );
      expect(calledWithOffset25).toBe(true);
    });

    const orderBy = screen.getByLabelText(/order by/i);
    await user.click(orderBy);
    await user.click(await screen.findByRole('option', { name: /^name$/i }));

    await waitFor(() => {
      const calledWithOrdering = vi
        .mocked(apiService.get)
        .mock.calls.some(
          ([url]) =>
            typeof url === 'string' &&
            url.includes('/distributions/deb/apt/') &&
            url.includes('limit=25') &&
            url.includes('offset=0') &&
            url.includes('ordering=name')
        );
      expect(calledWithOrdering).toBe(true);
    });
  });
});
