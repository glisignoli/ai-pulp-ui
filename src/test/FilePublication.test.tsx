import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { FilePublication } from '../components/file/FilePublication';
import { apiService } from '../services/api';

vi.mock('../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  formatPulpApiError: (_err: unknown, fallback: string) => fallback,
}));

const renderFilePublication = () => {
  return render(
    <BrowserRouter>
      <FilePublication />
    </BrowserRouter>
  );
};

describe('FilePublication Component', () => {
  beforeEach(() => {
    vi.mocked(apiService.get).mockReset();
    vi.mocked(apiService.post).mockReset();
    vi.mocked(apiService.put).mockReset();
    vi.mocked(apiService.delete).mockReset();
  });

  const getMuiSelectComboboxes = (container: HTMLElement): HTMLElement[] => {
    // Autocomplete uses an <input role="combobox" aria-autocomplete="list"/>
    // MUI Select uses role="combobox" without aria-autocomplete.
    return within(container)
      .getAllByRole('combobox')
      .filter((el) => !el.getAttribute('aria-autocomplete')) as unknown as HTMLElement[];
  };

  it('submits create publication with default manifest and checkpoint false', async () => {
    const user = userEvent.setup();

    const emptyList = { count: 0, next: null, previous: null, results: [] };
    const mockRepositories = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/repositories/file/file/1/',
          name: 'file-repo-1',
        },
      ],
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/publications/file/file/')) return Promise.resolve(emptyList);
      if (url.includes('/versions/')) return Promise.resolve(emptyList);
      if (url.includes('/repositories/file/file/')) return Promise.resolve(mockRepositories);
      return Promise.resolve(emptyList);
    });

    vi.mocked(apiService.post).mockResolvedValueOnce({ task: '/pulp/api/v3/tasks/1/' } as any);

    renderFilePublication();

    await user.click(await screen.findByRole('button', { name: /create publication/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Create Publication')).toBeInTheDocument();

    const selects = getMuiSelectComboboxes(dialog);
    const repositorySelect = selects[0];
    await user.click(repositorySelect);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'file-repo-1' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('option', { name: 'file-repo-1' }));

    const dialogButtons = screen.getAllByRole('button', { name: /^create$/i });
    const submitButton = dialogButtons[dialogButtons.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(
        '/publications/file/file/',
        expect.objectContaining({
          repository: '/pulp/api/v3/repositories/file/file/1/',
          manifest: 'PULP_MANIFEST',
          checkpoint: false,
        })
      );
    });
  });

  it('submits create publication with repository_version and checkpoint enabled', async () => {
    const user = userEvent.setup();

    const emptyList = { count: 0, next: null, previous: null, results: [] };
    const mockRepositories = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/repositories/file/file/1/',
          name: 'file-repo-1',
        },
      ],
    };

    const mockVersions = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/repositories/file/file/1/versions/1/',
          number: 1,
        },
      ],
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/publications/file/file/')) return Promise.resolve(emptyList);
      if (url.includes('/versions/')) return Promise.resolve(mockVersions);
      if (url.includes('/repositories/file/file/')) return Promise.resolve(mockRepositories);
      return Promise.resolve(emptyList);
    });

    vi.mocked(apiService.post).mockResolvedValueOnce({ task: '/pulp/api/v3/tasks/2/' } as any);

    renderFilePublication();

    await user.click(await screen.findByRole('button', { name: /create publication/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Create Publication')).toBeInTheDocument();

    const selects = getMuiSelectComboboxes(dialog);
    const repositorySelect = selects[0];
    await user.click(repositorySelect);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'file-repo-1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('option', { name: 'file-repo-1' }));

    // Select repository version
    const versionCombobox = within(dialog).getByRole('combobox', { name: /repository version/i });
    await user.click(versionCombobox);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Version 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('option', { name: 'Version 1' }));

    // Enable checkpoint
    await user.click(screen.getByRole('checkbox', { name: /checkpoint/i }));

    const dialogButtons = screen.getAllByRole('button', { name: /^create$/i });
    const submitButton = dialogButtons[dialogButtons.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(
        '/publications/file/file/',
        expect.objectContaining({
          repository_version: '/pulp/api/v3/repositories/file/file/1/versions/1/',
          checkpoint: true,
          manifest: 'PULP_MANIFEST',
        })
      );

      const call = vi.mocked(apiService.post).mock.calls[0];
      const payload = call?.[1] as any;
      expect(payload.repository).toBeUndefined();
    });
  });
});
