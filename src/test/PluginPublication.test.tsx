import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PluginPublication } from '../components/plugin/PluginPublication';
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

const huggingFace = getPlugin('hugging_face');

const repoHref = '/pulp/api/v3/repositories/hugging_face/hugging-face/1/';

const mockRepositories = [{ pulp_href: repoHref, name: 'hf-repo-1' }];

const mockPublications = [
  {
    pulp_href: '/pulp/api/v3/publications/hugging_face/hugging-face/1/',
    pulp_created: '2026-01-01T00:00:00Z',
    repository: repoHref,
  },
];

describe('PluginPublication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <PluginPublication plugin={huggingFace} />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders publications after loading', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/publications/hugging_face/hugging-face/')) {
        return Promise.resolve({ count: 1, next: null, previous: null, results: mockPublications } as any);
      }
      if (url.startsWith('/repositories/hugging_face/hugging-face/')) {
        return Promise.resolve({ count: 1, next: null, previous: null, results: mockRepositories } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    render(
      <MemoryRouter>
        <PluginPublication plugin={huggingFace} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hugging Face Publications')).toBeInTheDocument();
      expect(screen.getByText('hf-repo-1')).toBeInTheDocument();
    });
  });

  it('creates a publication for the selected repository', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/publications/hugging_face/hugging-face/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      if (url.startsWith('/repositories/hugging_face/hugging-face/')) {
        return Promise.resolve({ count: 1, next: null, previous: null, results: mockRepositories } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginPublication plugin={huggingFace} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Publication' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Publication' }));

    const dialog = await screen.findByRole('dialog');
    const repositoryInput = within(dialog).getByRole('combobox', { name: 'Repository' });
    fireEvent.keyDown(repositoryInput, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('hf-repo-1'));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/publications/hugging_face/hugging-face/', {
        repository: repoHref,
      });
    });
  });
});
