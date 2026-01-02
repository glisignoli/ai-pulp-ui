import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RpmPublicationDetail } from '../components/rpm/RpmPublicationDetail';
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

describe('RpmPublicationDetail', () => {
  const pubHref = '/pulp/api/v3/publications/rpm/rpm/1/';

  const basePublication = {
    pulp_href: pubHref,
    pulp_created: '2025-01-01T12:00:00Z',
    repository_version: '/pulp/api/v3/repositories/rpm/rpm/1/versions/1/',
    checksum_type: 'sha256',
    compression_type: 'zstd',
    metadata_checksum_type: 'sha256',
    package_checksum_type: 'sha256',
    repo_gpgcheck: true,
    sqlite_metadata: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAt = (href: string) => {
    return render(
      <MemoryRouter initialEntries={[`/rpm/publication/view?href=${encodeURIComponent(href)}`]}>
        <Routes>
          <Route path="/rpm/publication/view" element={<RpmPublicationDetail />} />
          <Route path="/rpm/publication" element={<div>Publication List</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders publication details with GET request', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === pubHref) return Promise.resolve(basePublication as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(pubHref);

    await waitFor(() => {
      expect(screen.getByText('Publication Details')).toBeInTheDocument();
    });

    expect(screen.getByText('GET Result')).toBeInTheDocument();
    expect(screen.getByText(/"checksum_type"\s*:\s*"sha256"/i)).toBeInTheDocument();
    expect(screen.getByText(/"compression_type"\s*:\s*"zstd"/i)).toBeInTheDocument();
  });

  it('shows error when publication not found', async () => {
    vi.mocked(apiService.get).mockRejectedValue(new Error('Not found'));

    renderAt(pubHref);

    await waitFor(() => {
      expect(screen.getByText(/failed to load publication/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /back to publications/i })).toBeInTheDocument();
  });

  it('deletes publication when confirmed', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === pubHref) return Promise.resolve(basePublication as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.delete).mockResolvedValue({} as any);

    renderAt(pubHref);

    await waitFor(() => {
      expect(screen.getByText('Publication Details')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/confirm delete/i)).toBeInTheDocument();
    });

    // Find the confirm button within the dialog
    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith(pubHref);
    });
  });

  it('displays all publication fields correctly', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === pubHref) return Promise.resolve(basePublication as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(pubHref);

    await waitFor(() => {
      expect(screen.getByText('Publication Details')).toBeInTheDocument();
    });

    expect(screen.getByText('GET Result')).toBeInTheDocument();

    // Check that key fields are present in the JSON output
    expect(screen.getByText(/"pulp_href"\s*:\s*"\/pulp\/api\/v3\/publications\/rpm\/rpm\/1\/"/)).toBeInTheDocument();
    expect(screen.getByText(/"pulp_created"\s*:\s*"2025-01-01T12:00:00Z"/)).toBeInTheDocument();
    expect(screen.getByText(/"repository_version"\s*:\s*"\/pulp\/api\/v3\/repositories\/rpm\/rpm\/1\/versions\/1\/"/)).toBeInTheDocument();
    expect(screen.getByText(/"checksum_type"\s*:\s*"sha256"/)).toBeInTheDocument();
    expect(screen.getByText(/"compression_type"\s*:\s*"zstd"/)).toBeInTheDocument();
    expect(screen.getByText(/"metadata_checksum_type"\s*:\s*"sha256"/)).toBeInTheDocument();
    expect(screen.getByText(/"package_checksum_type"\s*:\s*"sha256"/)).toBeInTheDocument();
    expect(screen.getByText(/"repo_gpgcheck"\s*:\s*true/)).toBeInTheDocument();
    expect(screen.getByText(/"sqlite_metadata"\s*:\s*true/)).toBeInTheDocument();
  });

  it('formats date correctly', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === pubHref) return Promise.resolve(basePublication as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(pubHref);

    await waitFor(() => {
      expect(screen.getByText('Publication Details')).toBeInTheDocument();
    });

    // Date should appear in JSON output as the ISO timestamp
    expect(screen.getByText(/"pulp_created"\s*:\s*"2025-01-01T12:00:00Z"/)).toBeInTheDocument();
  });

  it('displays boolean fields as Yes/No', async () => {
    const pubWithFalseValues = {
      ...basePublication,
      repo_gpgcheck: false,
      sqlite_metadata: false,
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === pubHref) return Promise.resolve(pubWithFalseValues as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(pubHref);

    await waitFor(() => {
      expect(screen.getByText('Publication Details')).toBeInTheDocument();
    });

    expect(screen.getByText('GET Result')).toBeInTheDocument();
    expect(screen.getByText(/"repo_gpgcheck"\s*:\s*false/)).toBeInTheDocument();
    expect(screen.getByText(/"sqlite_metadata"\s*:\s*false/)).toBeInTheDocument();
  });
});
