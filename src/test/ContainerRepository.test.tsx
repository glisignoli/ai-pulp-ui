import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ContainerRepository } from '../components/container/ContainerRepository';
import { apiService } from '../services/api';

vi.mock('../services/api');

describe('ContainerRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <ContainerRepository />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders repositories after loading', async () => {
    const repoHref = '/pulp/api/v3/repositories/container/container/1/';
    const remoteHref = '/pulp/api/v3/remotes/container/container/9/';

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === '/repositories/container/container/') {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              pulp_href: repoHref,
              name: 'test-container-repo',
              description: 'Test repository',
              retain_repo_versions: 2,
              remote: remoteHref,
            },
          ],
        } as any);
      }
      if (url === '/remotes/container/container/') {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: remoteHref, name: 'test-remote', url: 'https://example.com' }],
        } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    render(
      <MemoryRouter>
        <ContainerRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test-container-repo')).toBeInTheDocument();
      expect(screen.getByText('Test repository')).toBeInTheDocument();
      expect(screen.getByText('test-remote')).toBeInTheDocument();
    });
  });

  it('opens create dialog when Create Repository is clicked', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === '/repositories/container/container/' || url === '/remotes/container/container/') {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    render(
      <MemoryRouter>
        <ContainerRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Repository' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Repository' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
    });
  });

  it('creates a new repository with expected payload', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === '/repositories/container/container/' || url === '/remotes/container/container/') {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <ContainerRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Repository' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Repository' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /name/i }), {
      target: { value: 'new-container-repo' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /description/i }), {
      target: { value: 'New container repo description' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/repositories/container/container/', {
        name: 'new-container-repo',
        description: 'New container repo description',
        retain_repo_versions: null,
        remote: null,
        manifest_signing_service: null,
      });
    });
  });
});
