import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ContainerDistribution } from '../components/container/ContainerDistribution';
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

describe('ContainerDistribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <ContainerDistribution />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders distributions after loading', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/distributions/container/container/')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: '/pulp/api/v3/distributions/container/container/1/',
              name: 'dist-1',
              base_path: 'containers/dist-1',
              hidden: false,
              repository: '/pulp/api/v3/repositories/container/container/1/',
            },
          ],
        } as any);
      }
      if (url.startsWith('/repositories/container/container/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    render(
      <MemoryRouter>
        <ContainerDistribution />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('dist-1')).toBeInTheDocument();
      expect(screen.getByText('containers/dist-1')).toBeInTheDocument();
    });
  });

  it('opens create dialog when Create Distribution is clicked', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/distributions/container/container/') || url.startsWith('/repositories/container/container/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    render(
      <MemoryRouter>
        <ContainerDistribution />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Distribution' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Distribution' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /base path/i })).toBeInTheDocument();
    });
  });

  it('creates a new distribution with repository_version href', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/distributions/container/container/') || url.startsWith('/repositories/container/container/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <ContainerDistribution />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Distribution' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Distribution' }));

    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: /name/i }), {
      target: { value: 'new-dist' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /base path/i }), {
      target: { value: 'containers/new-dist' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /repository version/i }), {
      target: { value: '/pulp/api/v3/repositories/container/container/1/versions/2/' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/distributions/container/container/', {
        name: 'new-dist',
        base_path: 'containers/new-dist',
        content_guard: null,
        hidden: false,
        repository: null,
        repository_version: '/pulp/api/v3/repositories/container/container/1/versions/2/',
        private: false,
        description: null,
      });
    });
  });
});
