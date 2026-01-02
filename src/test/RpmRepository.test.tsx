import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RpmRepository } from '../components/rpm/RpmRepository';
import { apiService } from '../services/api';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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
    pulp_href: '/pulp/api/v3/repositories/rpm/rpm/1/',
    name: 'test-repo',
    description: 'Test repository',
    retain_repo_versions: 5,
  },
  {
    pulp_href: '/pulp/api/v3/repositories/rpm/rpm/2/',
    name: 'another-repo',
    description: 'Another repository',
    retain_repo_versions: 3,
  },
];

describe('RpmRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiService.get).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders repositories after loading', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({
          count: 2,
          next: null,
          previous: null,
          results: mockRepositories,
        });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
      expect(screen.getByText('another-repo')).toBeInTheDocument();
    });
  });

  it('shows error when loading fails', async () => {
    vi.mocked(apiService.get).mockRejectedValue(new Error('Failed to load'));

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load repositories')).toBeInTheDocument();
    });
  });

  it('opens create dialog when Create Repository button is clicked', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Repository')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Repository'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
    });
  });

  it('creates a new repository', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
    vi.mocked(apiService.post).mockResolvedValue({});

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Repository')).toBeInTheDocument();
    });

    // Open create dialog
    fireEvent.click(screen.getByText('Create Repository'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Fill in form
    const nameInput = screen.getByRole('textbox', { name: /name/i });
    const descInput = screen.getByRole('textbox', { name: /description/i });
    
    fireEvent.change(nameInput, { target: { value: 'new-repo' } });
    fireEvent.change(descInput, { target: { value: 'New repo description' } });

    // Submit form
    const createButton = screen.getAllByText('Create').find(
      (button) => button.closest('button') !== null
    );
    if (createButton) {
      fireEvent.click(createButton);
    }

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/repositories/rpm/rpm/', {
        name: 'new-repo',
        description: 'New repo description',
        retain_repo_versions: undefined,
        autopublish: false,
        retain_package_versions: undefined,
      });
    });
  });

  it('prevents create when retain versions are negative', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
    vi.mocked(apiService.post).mockResolvedValue({});

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Repository')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Repository'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: /name/i }), { target: { value: 'new-repo' } });

    fireEvent.change(screen.getByRole('spinbutton', { name: /retain repository versions/i }), {
      target: { value: '-1' },
    });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText('Retain Repository Versions must be >= 0')).toBeInTheDocument();
    });
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('opens edit dialog when edit button is clicked', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [mockRepositories[0]],
        });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
    });

    // Click edit button
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-repo')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test repository')).toBeInTheDocument();
    });
  });

  it('updates an existing repository', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [mockRepositories[0]],
        });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
    vi.mocked(apiService.put).mockResolvedValue({});

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
    });

    // Click edit button
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Update description
    const descInput = screen.getByRole('textbox', { name: /description/i });
    fireEvent.change(descInput, { target: { value: 'Updated description' } });

    // Submit form
    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith(
        '/pulp/api/v3/repositories/rpm/rpm/1/',
        {
          name: 'test-repo',
          description: 'Updated description',
          retain_repo_versions: 5,
          autopublish: false,
          retain_package_versions: undefined,
        }
      );
    });
  });

  it('opens delete confirmation dialog', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [mockRepositories[0]],
        });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    });
  });

  it('deletes a repository', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [mockRepositories[0]],
        });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
    vi.mocked(apiService.delete).mockResolvedValue({});

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButton = screen.getAllByText('Delete').find(
      (button) => button.closest('button') !== null
    );
    if (confirmButton) {
      fireEvent.click(confirmButton);
    }

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith('/pulp/api/v3/repositories/rpm/rpm/1/');
    });
  });

  it('cancels delete operation', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [mockRepositories[0]],
        });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
    vi.mocked(apiService.delete).mockResolvedValue({});

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    // Cancel deletion
    const cancelButton = screen.getAllByText('Cancel')[0];
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });

    expect(apiService.delete).not.toHaveBeenCalled();
  });

  it('creates a repository with a remote', async () => {
    const mockRemotes = [
      {
        pulp_href: '/pulp/api/v3/remotes/rpm/rpm/1/',
        name: 'test-remote',
        url: 'https://example.com/repo',
      },
    ];

    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: mockRemotes,
        });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
    vi.mocked(apiService.post).mockResolvedValue({});

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Repository')).toBeInTheDocument();
    });

    // Open create dialog
    fireEvent.click(screen.getByText('Create Repository'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Verify remotes are loaded for the autocomplete
    await waitFor(() => {
      expect(apiService.get).toHaveBeenCalledWith('/remotes/rpm/rpm/?limit=25&offset=0');
    });
  });

  it('creates a new repository with repo_config when valid JSON is provided', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
    vi.mocked(apiService.post).mockResolvedValue({});

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Repository')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Repository'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: /name/i }), { target: { value: 'repo-with-config' } });
    fireEvent.change(screen.getByRole('textbox', { name: /repo config \(json\)/i }), {
      target: { value: '{"foo":"bar","enabled":true}' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/repositories/rpm/rpm/', {
        name: 'repo-with-config',
        description: undefined,
        retain_repo_versions: undefined,
        autopublish: false,
        retain_package_versions: undefined,
        repo_config: { foo: 'bar', enabled: true },
      });
    });
  });

  it('prevents create when repo_config contains invalid JSON', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
    vi.mocked(apiService.post).mockResolvedValue({});

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Repository')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Repository'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: /name/i }), { target: { value: 'bad-config' } });
    fireEvent.change(screen.getByRole('textbox', { name: /repo config \(json\)/i }), {
      target: { value: '{not valid json' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid JSON in repo_config')).toBeInTheDocument();
    });
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('updates an existing repository with repo_config when valid JSON is provided', async () => {
    const repoWithConfig = {
      ...mockRepositories[0],
      repo_config: { a: 1 },
    };

    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({ count: 1, next: null, previous: null, results: [repoWithConfig] });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
    vi.mocked(apiService.put).mockResolvedValue({});

    render(
      <MemoryRouter>
        <RpmRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByTitle('Edit')[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: /repo config \(json\)/i }), {
      target: { value: '{"x": 123}' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith(
        '/pulp/api/v3/repositories/rpm/rpm/1/',
        expect.objectContaining({
          name: 'test-repo',
          repo_config: { x: 123 },
        })
      );
    });
  });
});
  it('navigates to repository view when View is clicked', async () => {
    vi.mocked(apiService.get).mockImplementation((url) => {
      if (url.includes('repositories')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [mockRepositories[0]],
        });
      }
      if (url.includes('remotes')) {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        });
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    render(
      <MemoryRouter initialEntries={['/rpm/repository']}>
        <Routes>
          <Route path="/rpm/repository" element={<RpmRepository />} />
          <Route path="/rpm/repository/view" element={<div>Repository Detail View</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByTitle('View')[0]);

    await waitFor(() => {
      expect(screen.getByText('Repository Detail View')).toBeInTheDocument();
    });
  });
