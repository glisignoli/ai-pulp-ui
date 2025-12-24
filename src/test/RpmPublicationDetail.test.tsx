import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RpmPublicationDetail } from '../components/rpm/RpmPublicationDetail';
import { apiService } from '../services/api';

vi.mock('../services/api');

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

    expect(screen.getByText('Publication Information')).toBeInTheDocument();
    expect(screen.getAllByText('sha256').length).toBeGreaterThan(0);
    expect(screen.getByText('zstd')).toBeInTheDocument();
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

    // Check that all fields are displayed
    expect(screen.getByText('Pulp Href')).toBeInTheDocument();
    expect(screen.getByText('Pulp Created')).toBeInTheDocument();
    expect(screen.getByText('Repository Version')).toBeInTheDocument();
    expect(screen.getByText('Checksum Type')).toBeInTheDocument();
    expect(screen.getByText('Compression Type')).toBeInTheDocument();
    expect(screen.getByText('Metadata Checksum Type')).toBeInTheDocument();
    expect(screen.getByText('Package Checksum Type')).toBeInTheDocument();
    expect(screen.getByText('Repo GPG Check')).toBeInTheDocument();
    expect(screen.getByText('SQLite Metadata')).toBeInTheDocument();
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

    // The date should be formatted as locale string
    const dateString = new Date('2025-01-01T12:00:00Z').toLocaleString();
    expect(screen.getByText(dateString)).toBeInTheDocument();
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

    // Should have "No" for both boolean fields
    const noCells = screen.getAllByText('No');
    expect(noCells.length).toBeGreaterThanOrEqual(2);
  });
});
