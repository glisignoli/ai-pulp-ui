import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DebRepository } from '../components/deb/DebRepository';
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

const mockRepositories = [
  {
    pulp_href: '/pulp/api/v3/repositories/deb/apt/1/',
    name: 'deb-repo-1',
    description: 'Test deb repo',
    retain_repo_versions: 3,
  },
];

describe('DebRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <DebRepository />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders repositories after loading', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/repositories/deb/apt/')) {
        return Promise.resolve({ count: 1, next: null, previous: null, results: mockRepositories });
      }
      if (url.includes('/remotes/deb/apt/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });

    render(
      <MemoryRouter>
        <DebRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DEB Repositories')).toBeInTheDocument();
      expect(screen.getByText('deb-repo-1')).toBeInTheDocument();
      expect(screen.getByText('Test deb repo')).toBeInTheDocument();
    });
  });

  it('creates a new repository with pulp_labels and signing_service_release_overrides when provided', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/repositories/deb/apt/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('/remotes/deb/apt/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });
    vi.mocked(apiService.post).mockResolvedValue({});

    render(
      <MemoryRouter>
        <DebRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Repository')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Repository'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: /name/i }), { target: { value: 'new-deb-repo' } });
    fireEvent.change(screen.getByRole('textbox', { name: /description/i }), { target: { value: 'New deb repo' } });

    fireEvent.change(screen.getByRole('textbox', { name: /pulp labels \(json\)/i }), {
      target: { value: '{"env":"dev"}' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /signing service release overrides \(json\)/i }), {
      target: {
        value: '{"bionic":"/pulp/api/v3/signing-services/433a1f70-c589-4413-a803-c50b842ea9b5/"}',
      },
    });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalled();
    });

    const postArgs = vi.mocked(apiService.post).mock.calls[0];
    expect(postArgs[0]).toBe('/repositories/deb/apt/');
    expect(postArgs[1]).toMatchObject({
      name: 'new-deb-repo',
      description: 'New deb repo',
      retain_repo_versions: undefined,
      retain_package_versions: undefined,
      autopublish: false,
      publish_upstream_release_fields: true,
      pulp_labels: { env: 'dev' },
      signing_service_release_overrides: {
        bionic: '/pulp/api/v3/signing-services/433a1f70-c589-4413-a803-c50b842ea9b5/',
      },
    });
    expect('remote' in (postArgs[1] as any)).toBe(false);
    expect('signing_service' in (postArgs[1] as any)).toBe(false);
  });

  it('prevents submit when retain package versions is 0', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/repositories/deb/apt/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('/remotes/deb/apt/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });
    vi.mocked(apiService.post).mockResolvedValue({});

    render(
      <MemoryRouter>
        <DebRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Repository')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Repository'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: /name/i }), { target: { value: 'new-deb-repo' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /retain package versions/i }), { target: { value: '0' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText('Retain Package Versions must be null or > 0')).toBeInTheDocument();
    });
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('prevents submit when signing_service_release_overrides JSON is invalid', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/repositories/deb/apt/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('/remotes/deb/apt/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });
    vi.mocked(apiService.post).mockResolvedValue({});

    render(
      <MemoryRouter>
        <DebRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Repository')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Repository'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: /name/i }), { target: { value: 'new-deb-repo' } });
    fireEvent.change(screen.getByRole('textbox', { name: /signing service release overrides \(json\)/i }), {
      target: { value: '{"bionic": 1}' },
    });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText('Invalid signing_service_release_overrides JSON')).toBeInTheDocument();
    });
    expect(apiService.post).not.toHaveBeenCalled();
  });
});
