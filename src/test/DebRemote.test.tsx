import { render, screen, waitFor } from '@testing-library/react';
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
});
