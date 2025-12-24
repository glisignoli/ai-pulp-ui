import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RpmRemoteDetail } from '../components/rpm/RpmRemoteDetail';
import { apiService } from '../services/api';

vi.mock('../services/api');

describe('RpmRemoteDetail', () => {
  const remoteHref = '/pulp/api/v3/remotes/rpm/rpm/1/';

  const baseRemote = {
    pulp_href: remoteHref,
    name: 'test-remote',
    url: 'https://example.com/repo/',
    ca_cert: null,
    client_cert: null,
    tls_validation: true,
    proxy_url: null,
    download_concurrency: 10,
    max_retries: 3,
    policy: 'immediate',
    total_timeout: null,
    connect_timeout: null,
    sock_connect_timeout: null,
    sock_read_timeout: null,
    rate_limit: null,
    headers: [],
    sles_auth_token: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAt = (href: string) => {
    return render(
      <MemoryRouter initialEntries={[`/rpm/remote/view?href=${encodeURIComponent(href)}`]}>
        <Routes>
          <Route path="/rpm/remote/view" element={<RpmRemoteDetail />} />
          <Route path="/rpm/remote" element={<div>Remote List</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders remote details with GET request', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === remoteHref) return Promise.resolve(baseRemote as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(remoteHref);

    await waitFor(() => {
      expect(screen.getByText('Remote: test-remote')).toBeInTheDocument();
    });

    expect(screen.getByText('Remote Information')).toBeInTheDocument();
    expect(screen.getByText('test-remote')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/repo/')).toBeInTheDocument();
    expect(screen.getByText('immediate')).toBeInTheDocument();
  });

  it('shows error when remote not found', async () => {
    vi.mocked(apiService.get).mockRejectedValue(new Error('Not found'));

    renderAt(remoteHref);

    await waitFor(() => {
      expect(screen.getByText(/failed to load remote/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /back to remotes/i })).toBeInTheDocument();
  });

  it('opens edit dialog and updates remote', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === remoteHref) return Promise.resolve(baseRemote as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.put).mockResolvedValue({} as any);

    renderAt(remoteHref);

    await waitFor(() => {
      expect(screen.getByText('Remote: test-remote')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Remote')).toBeInTheDocument();
    });

    // Get the URL field from the dialog
    const dialog = screen.getByRole('dialog');
    const urlInput = within(dialog).getAllByRole('textbox').find(input => input.getAttribute('name') === 'URL' || input.closest('.MuiFormControl-root')?.textContent?.includes('URL'));
    if (urlInput) {
      fireEvent.change(urlInput, { target: { value: 'https://updated.com/repo/' } });
    }

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith(
        remoteHref,
        expect.objectContaining({
          name: 'test-remote',
          url: 'https://updated.com/repo/',
          tls_validation: true,
          policy: 'immediate',
        })
      );
    });
  });

  it('deletes remote when confirmed', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === remoteHref) return Promise.resolve(baseRemote as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });
    vi.mocked(apiService.delete).mockResolvedValue({} as any);

    renderAt(remoteHref);

    await waitFor(() => {
      expect(screen.getByText('Remote: test-remote')).toBeInTheDocument();
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
      expect(apiService.delete).toHaveBeenCalledWith(remoteHref);
    });
  });

  it('displays all remote fields correctly', async () => {
    const fullRemote = {
      ...baseRemote,
      proxy_url: 'http://proxy.example.com:8080',
      total_timeout: 300,
      connect_timeout: 30,
      rate_limit: 100,
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === remoteHref) return Promise.resolve(fullRemote as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(remoteHref);

    await waitFor(() => {
      expect(screen.getByText('Remote: test-remote')).toBeInTheDocument();
    });

    // Check that all fields are displayed
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('Policy')).toBeInTheDocument();
    expect(screen.getByText('TLS Validation')).toBeInTheDocument();
    expect(screen.getByText('Proxy URL')).toBeInTheDocument();
    expect(screen.getByText('Download Concurrency')).toBeInTheDocument();
    expect(screen.getByText('Max Retries')).toBeInTheDocument();
    expect(screen.getByText('Total Timeout')).toBeInTheDocument();
    expect(screen.getByText('Connect Timeout')).toBeInTheDocument();
    expect(screen.getByText('Rate Limit')).toBeInTheDocument();
  });

  it('displays TLS validation boolean correctly', async () => {
    const remoteNoTLS = {
      ...baseRemote,
      tls_validation: false,
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === remoteHref) return Promise.resolve(remoteNoTLS as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(remoteHref);

    await waitFor(() => {
      expect(screen.getByText('Remote: test-remote')).toBeInTheDocument();
    });

    // Should display "No" for TLS validation
    const tlsRow = screen.getByText('TLS Validation').closest('tr');
    expect(tlsRow).toHaveTextContent('No');
  });

  it('displays timeout values with seconds suffix', async () => {
    const remoteWithTimeouts = {
      ...baseRemote,
      total_timeout: 300,
      connect_timeout: 30,
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === remoteHref) return Promise.resolve(remoteWithTimeouts as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(remoteHref);

    await waitFor(() => {
      expect(screen.getByText('Remote: test-remote')).toBeInTheDocument();
    });

    expect(screen.getByText('300s')).toBeInTheDocument();
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  it('displays rate limit with proper label', async () => {
    const remoteWithRateLimit = {
      ...baseRemote,
      rate_limit: 100,
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === remoteHref) return Promise.resolve(remoteWithRateLimit as any);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] } as any);
    });

    renderAt(remoteHref);

    await waitFor(() => {
      expect(screen.getByText('Remote: test-remote')).toBeInTheDocument();
    });

    expect(screen.getByText('100 requests/second')).toBeInTheDocument();
  });
});
