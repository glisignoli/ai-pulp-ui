import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DebPackages } from '../components/deb/DebPackages';
import { apiService } from '../services/api';

vi.mock('../services/api');

const mockPackages = [
  {
    pulp_href: '/pulp/api/v3/content/deb/packages/1/',
    pulp_created: '2024-01-01T00:00:00Z',
    package: 'bash',
    version: '5.2',
    architecture: 'amd64',
    section: 'shells',
    maintainer: 'Someone <someone@example.org>',
  },
];

describe('DebPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <DebPackages />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders packages after loading', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ count: 1, next: null, previous: null, results: mockPackages });

    render(
      <MemoryRouter>
        <DebPackages />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DEB Packages')).toBeInTheDocument();
      expect(screen.getByText('bash')).toBeInTheDocument();
      expect(screen.getByText('5.2')).toBeInTheDocument();
      expect(screen.getByText('amd64')).toBeInTheDocument();
    });
  });
});
