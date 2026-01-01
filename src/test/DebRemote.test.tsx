import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DebRemote } from '../components/deb/DebRemote';
import { apiService } from '../services/api';

vi.mock('../services/api');

const mockRemotes = [
  {
    pulp_href: '/pulp/api/v3/remotes/deb/apt/1/',
    name: 'deb-remote-1',
    url: 'https://example.org/debian',
    distributions: 'stable',
  },
];

describe('DebRemote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <DebRemote />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders remotes after loading', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 1, next: null, previous: null, results: mockRemotes });

    render(
      <MemoryRouter>
        <DebRemote />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DEB Remotes')).toBeInTheDocument();
      expect(screen.getByText('deb-remote-1')).toBeInTheDocument();
      expect(screen.getByText('https://example.org/debian')).toBeInTheDocument();
      expect(screen.getByText('stable')).toBeInTheDocument();
    });
  });

  it('creates a remote with headers when provided', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    (apiService.post as any).mockResolvedValue({});

    render(
      <MemoryRouter>
        <DebRemote />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No remotes found')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /create remote/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Name$/i), { target: { value: 'headered-deb-remote' } });
    fireEvent.change(within(dialog).getByLabelText(/^URL$/i), { target: { value: 'https://example.org/debian' } });
    fireEvent.change(within(dialog).getByLabelText(/distributions/i), { target: { value: 'stable' } });
    fireEvent.change(within(dialog).getByLabelText(/headers \(json\)/i), { target: { value: '{"X-Test":"1"}' } });

    fireEvent.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/remotes/deb/apt/', {
        name: 'headered-deb-remote',
        url: 'https://example.org/debian',
        tls_validation: true,
        policy: 'immediate',
        distributions: 'stable',
        sync_sources: false,
        sync_udebs: false,
        sync_installer: false,
        ignore_missing_package_indices: false,
        download_concurrency: 1,
        max_retries: 3,
        rate_limit: 0,
        headers: { 'X-Test': '1' },
      });
    });
  });

  it('creates a remote with pulp_labels when provided', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    (apiService.post as any).mockResolvedValue({});

    render(
      <MemoryRouter>
        <DebRemote />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No remotes found')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /create remote/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Name$/i), { target: { value: 'labeled-deb-remote' } });
    fireEvent.change(within(dialog).getByLabelText(/^URL$/i), { target: { value: 'https://example.org/debian' } });
    fireEvent.change(within(dialog).getByLabelText(/distributions/i), { target: { value: 'stable' } });
    fireEvent.change(within(dialog).getByLabelText(/pulp labels \(json\)/i), { target: { value: '{"env":"dev"}' } });

    fireEvent.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(
        '/remotes/deb/apt/',
        expect.objectContaining({
          pulp_labels: { env: 'dev' },
        })
      );
    });
  });

  it('prevents submit when headers JSON is invalid', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    (apiService.post as any).mockResolvedValue({});

    render(
      <MemoryRouter>
        <DebRemote />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No remotes found')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /create remote/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Name$/i), { target: { value: 'bad-headers-remote' } });
    fireEvent.change(within(dialog).getByLabelText(/^URL$/i), { target: { value: 'https://example.org/debian' } });
    fireEvent.change(within(dialog).getByLabelText(/distributions/i), { target: { value: 'stable' } });
    fireEvent.change(within(dialog).getByLabelText(/headers \(json\)/i), { target: { value: '{"k": 1}' } });

    fireEvent.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/invalid headers json/i).length).toBeGreaterThan(0);
    });
    expect(apiService.post).not.toHaveBeenCalled();
  });
});
