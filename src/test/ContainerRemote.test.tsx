import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ContainerRemote } from '../components/container/ContainerRemote';
import { apiService } from '../services/api';

vi.mock('../services/api');

const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('ContainerRemote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<ContainerRemote />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('loads and displays list of remotes', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/remotes/container/container/1/',
          name: 'test-remote-1',
          url: 'https://example.com/repo1',
          policy: 'immediate',
          tls_validation: true,
          upstream_name: 'library',
        },
        {
          pulp_href: '/pulp/api/v3/remotes/container/container/2/',
          name: 'test-remote-2',
          url: 'https://example.com/repo2',
          policy: 'on_demand',
          tls_validation: false,
          upstream_name: 'vendor',
        },
      ],
    } as any);

    renderWithRouter(<ContainerRemote />);

    await waitFor(() => {
      expect(screen.getByText('test-remote-1')).toBeInTheDocument();
      expect(screen.getByText('test-remote-2')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/repo1')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/repo2')).toBeInTheDocument();
    });
  });

  it('opens create dialog when Create Remote button is clicked', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 0, next: null, previous: null, results: [] } as any);

    renderWithRouter(<ContainerRemote />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Remote' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Remote' }));

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/^Name\b/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/^URL\b/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/^Upstream Name\b/i)).toBeInTheDocument();
    });
  });

  it('creates a new remote (including tag parsing)', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 0, next: null, previous: null, results: [] } as any);
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    renderWithRouter(<ContainerRemote />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Remote' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Remote' }));

    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Name\b/i), {
      target: { value: 'new-remote' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^URL\b/i), {
      target: { value: 'https://example.com/new' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Upstream Name\b/i), {
      target: { value: 'library' },
    });

    fireEvent.change(within(dialog).getByRole('textbox', { name: /include tags/i }), {
      target: { value: 'a,b\n c' },
    });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /sigstore/i }), {
      target: { value: 'https://sigstore.example.com' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/remotes/container/container/', {
        name: 'new-remote',
        url: 'https://example.com/new',
        tls_validation: true,
        policy: 'immediate',
        upstream_name: 'library',
        include_tags: ['a', 'b', 'c'],
        sigstore: 'https://sigstore.example.com',
      });
    });
  });
});
