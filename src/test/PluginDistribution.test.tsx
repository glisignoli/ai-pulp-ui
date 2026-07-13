import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PluginDistribution } from '../components/plugin/PluginDistribution';
import { getPlugin } from '../constants/plugins';
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

const python = getPlugin('python');
const maven = getPlugin('maven');

describe('PluginDistribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <PluginDistribution plugin={python} />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders distributions after loading', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/distributions/python/pypi/')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: '/pulp/api/v3/distributions/python/pypi/1/',
              name: 'pypi-dist',
              base_path: 'pypi',
              repository: null,
              publication: null,
            },
          ],
        } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    render(
      <MemoryRouter>
        <PluginDistribution plugin={python} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Python Distributions')).toBeInTheDocument();
      expect(screen.getByText('pypi-dist')).toBeInTheDocument();
      expect(screen.getByText('pypi')).toBeInTheDocument();
    });

    // Python uses publications, so the column is shown.
    expect(screen.getByText('Publication')).toBeInTheDocument();
  });

  it('hides the publication column for plugins without publications', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 0, next: null, previous: null, results: [] } as any);

    render(
      <MemoryRouter>
        <PluginDistribution plugin={maven} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Maven Distributions')).toBeInTheDocument();
    });

    expect(screen.queryByText('Publication')).not.toBeInTheDocument();
  });

  it('creates a new distribution with expected payload', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 0, next: null, previous: null, results: [] } as any);
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginDistribution plugin={python} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Distribution' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Distribution' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /name/i }), {
      target: { value: 'pypi-dist' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /base path/i }), {
      target: { value: 'pypi' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/distributions/python/pypi/', {
        name: 'pypi-dist',
        base_path: 'pypi',
        repository: null,
        publication: null,
      });
    });
  });
});
