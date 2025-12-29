import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import RpmPublication from '../components/rpm/RpmPublication';
import { apiService } from '../services/api';

vi.mock('../services/api');

const mockedApiService = vi.mocked(apiService, { deep: true });

const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('RpmPublication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getMuiSelectComboboxes = (): HTMLElement[] => {
    // Autocomplete uses an <input role="combobox" aria-autocomplete="list"/>
    // MUI Select uses role="combobox" without aria-autocomplete.
    return screen
      .getAllByRole('combobox')
      .filter((el) => !el.getAttribute('aria-autocomplete')) as unknown as HTMLElement[];
  };

  it('should load and display publications', async () => {
    const mockPublications = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/publications/rpm/rpm/1/',
          repository: '/pulp/api/v3/repositories/rpm/rpm/1/',
          checksum_type: 'sha256',
          compression_type: 'zstd',
          layout: 'nested_alphabetically',
          pulp_created: '2024-01-01T00:00:00Z',
        },
      ],
    };

    const mockRepositories = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/repositories/rpm/rpm/1/',
          name: 'test-repo',
        },
      ],
    };

    mockedApiService.get.mockImplementation((url: string) => {
      if (url.includes('/versions/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('publications')) {
        return Promise.resolve(mockPublications);
      }
      if (url.includes('repositories')) {
        return Promise.resolve(mockRepositories);
      }
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });

    renderWithRouter(<RpmPublication />);

    await waitFor(() => {
      expect(screen.getByText('sha256')).toBeInTheDocument();
    });

    expect(apiService.get).toHaveBeenCalledWith('/pulp/api/v3/publications/rpm/rpm/');
  });

  it('should open create dialog when Create button is clicked', async () => {
    mockedApiService.get.mockImplementation((_url: string) => {
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });

    renderWithRouter(<RpmPublication />);

    await waitFor(() => {
      expect(screen.getByText('No publications found')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create publication/i });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create RPM Publication')).toBeInTheDocument();
    });
  });

  it('should create a publication with required fields', async () => {
    const mockRepositories = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/repositories/rpm/rpm/1/',
          name: 'test-repo',
        },
      ],
    };

    mockedApiService.get.mockImplementation((url: string) => {
      if (url.includes('/versions/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('publications')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('repositories')) {
        return Promise.resolve(mockRepositories);
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    mockedApiService.post.mockResolvedValueOnce({});

    renderWithRouter(<RpmPublication />);

    await waitFor(() => {
      expect(screen.getByText('No publications found')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create publication/i });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create RPM Publication')).toBeInTheDocument();
    });

    // Select repository (do not rely on combobox index; Autocomplete adds one)
    const selects = getMuiSelectComboboxes();
    const repositorySelect = selects[0];
    await userEvent.click(repositorySelect);
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'test-repo' })).toBeInTheDocument();
    });
    
    const option = screen.getByRole('option', { name: 'test-repo' });
    await userEvent.click(option);

    const dialogButtons = screen.getAllByRole('button', { name: /create/i });
    const submitButton = dialogButtons[dialogButtons.length - 1]; // Last Create button is in dialog
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(
        '/pulp/api/v3/publications/rpm/rpm/',
        expect.objectContaining({
          checkpoint: false,
          checksum_type: 'sha256',
          compression_type: 'zstd',
          layout: 'nested_alphabetically',
        })
      );
    });
  });

  it('should create publication with checkpoint enabled', async () => {
    const mockRepositories = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/repositories/rpm/rpm/1/',
          name: 'test-repo',
        },
      ],
    };

    mockedApiService.get.mockImplementation((url: string) => {
      if (url.includes('/versions/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('publications')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('repositories')) {
        return Promise.resolve(mockRepositories);
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    mockedApiService.post.mockResolvedValueOnce({});

    renderWithRouter(<RpmPublication />);

    await waitFor(() => {
      expect(screen.getByText('No publications found')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create publication/i });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create RPM Publication')).toBeInTheDocument();
    });

    // Select repository (do not rely on combobox index; Autocomplete adds one)
    const selects = getMuiSelectComboboxes();
    const repositorySelect = selects[0];
    await userEvent.click(repositorySelect);
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'test-repo' })).toBeInTheDocument();
    });
    
    const option = screen.getByRole('option', { name: 'test-repo' });
    await userEvent.click(option);

    // Enable checkpoint
    const checkpointCheckbox = screen.getByRole('checkbox', { name: /checkpoint/i });
    await userEvent.click(checkpointCheckbox);

    const dialogButtons = screen.getAllByRole('button', { name: /create/i });
    const submitButton = dialogButtons[dialogButtons.length - 1];
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(
        '/pulp/api/v3/publications/rpm/rpm/',
        expect.objectContaining({
          checkpoint: true,
        })
      );
    });
  });

  it('should open delete confirmation dialog', async () => {
    const mockPublications = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/publications/rpm/rpm/1/',
          repository: '/pulp/api/v3/repositories/rpm/rpm/1/',
          checksum_type: 'sha256',
          compression_type: 'zstd',
          layout: 'nested_alphabetically',
          pulp_created: '2024-01-01T00:00:00Z',
        },
      ],
    };

    mockedApiService.get.mockImplementation((url: string) => {
      if (url.includes('publications')) {
        return Promise.resolve(mockPublications);
      }
      if (url.includes('repositories')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    renderWithRouter(<RpmPublication />);

    await waitFor(() => {
      expect(screen.getByText('sha256')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('delete');
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });
  });

  it('should delete publication when confirmed', async () => {
    const mockPublications = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/publications/rpm/rpm/1/',
          repository: '/pulp/api/v3/repositories/rpm/rpm/1/',
          checksum_type: 'sha256',
          compression_type: 'zstd',
          layout: 'nested_alphabetically',
          pulp_created: '2024-01-01T00:00:00Z',
        },
      ],
    };

    mockedApiService.get.mockImplementation((url: string) => {
      if (url.includes('publications')) {
        return Promise.resolve(mockPublications);
      }
      if (url.includes('repositories')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    mockedApiService.delete.mockResolvedValueOnce({});

    renderWithRouter(<RpmPublication />);

    await waitFor(() => {
      expect(screen.getByText('sha256')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('delete');
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByRole('button', { name: /delete/i });
    const confirmButton = confirmButtons[confirmButtons.length - 1];
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith('/pulp/api/v3/publications/rpm/rpm/1/');
    });
  });

  it('should display error message when creation fails', async () => {
    const mockRepositories = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/repositories/rpm/rpm/1/',
          name: 'test-repo',
        },
      ],
    };

    mockedApiService.get.mockImplementation((url: string) => {
      if (url.includes('/versions/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('publications')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('repositories')) {
        return Promise.resolve(mockRepositories);
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    mockedApiService.post.mockRejectedValueOnce(new Error('Creation failed'));

    renderWithRouter(<RpmPublication />);

    await waitFor(() => {
      expect(screen.getByText('No publications found')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create publication/i });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create RPM Publication')).toBeInTheDocument();
    });

    const selects = getMuiSelectComboboxes();
    const repositorySelect = selects[0];
    await userEvent.click(repositorySelect);
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'test-repo' })).toBeInTheDocument();
    });
    
    const option = screen.getByRole('option', { name: 'test-repo' });
    await userEvent.click(option);

    const dialogButtons = screen.getAllByRole('button', { name: /create/i });
    const submitButton = dialogButtons[dialogButtons.length - 1];
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/creation failed/i)).toBeInTheDocument();
    });
  });

  it('should select different checksum types', async () => {
    const mockRepositories = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/repositories/rpm/rpm/1/',
          name: 'test-repo',
        },
      ],
    };

    mockedApiService.get.mockImplementation((url: string) => {
      if (url.includes('/versions/')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('publications')) {
        return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
      }
      if (url.includes('repositories')) {
        return Promise.resolve(mockRepositories);
      }
      return Promise.resolve({ count: 0, results: [] });
    });

    mockedApiService.post.mockResolvedValueOnce({});

    renderWithRouter(<RpmPublication />);

    await waitFor(() => {
      expect(screen.getByText('No publications found')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create publication/i });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create RPM Publication')).toBeInTheDocument();
    });

    // Select repository
    const selects = getMuiSelectComboboxes();
    const repositorySelect = selects[0];
    await userEvent.click(repositorySelect);
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'test-repo' })).toBeInTheDocument();
    });
    
    const repoOption = screen.getByRole('option', { name: 'test-repo' });
    await userEvent.click(repoOption);

    // Select SHA512 checksum type
    const checksumSelect = selects[1];
    await userEvent.click(checksumSelect);
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'SHA512' })).toBeInTheDocument();
    });
    
    const checksumOption = screen.getByRole('option', { name: 'SHA512' });
    await userEvent.click(checksumOption);

    const dialogButtons = screen.getAllByRole('button', { name: /create/i });
    const submitButton = dialogButtons[dialogButtons.length - 1];
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(
        '/pulp/api/v3/publications/rpm/rpm/',
        expect.objectContaining({
          checksum_type: 'sha512',
        })
      );
    });
  });
});
