import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PluginRemote } from '../components/plugin/PluginRemote';
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

const ansible = getPlugin('ansible');

describe('PluginRemote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <PluginRemote plugin={ansible} />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders remotes after loading', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/remotes/ansible/collection/')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: '/pulp/api/v3/remotes/ansible/collection/1/',
              name: 'galaxy',
              url: 'https://galaxy.ansible.com',
              policy: 'immediate',
            },
          ],
        } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    render(
      <MemoryRouter>
        <PluginRemote plugin={ansible} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ansible Remotes')).toBeInTheDocument();
      expect(screen.getByText('galaxy')).toBeInTheDocument();
      expect(screen.getByText('https://galaxy.ansible.com')).toBeInTheDocument();
    });
  });

  it('creates a new remote against the collection endpoint', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 0, next: null, previous: null, results: [] } as any);
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginRemote plugin={ansible} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Remote' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Remote' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^name/i }), {
      target: { value: 'galaxy' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^url/i }), {
      target: { value: 'https://galaxy.ansible.com' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/remotes/ansible/collection/', {
        name: 'galaxy',
        url: 'https://galaxy.ansible.com',
        policy: 'immediate',
        tls_validation: true,
      });
    });
  });
});
