import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FileRepository } from '../components/file';
import { PluginPublication } from '../components/plugin';
import { FILE_PLUGIN } from '../constants/plugins';
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

const emptyList = { count: 0, next: null, previous: null, results: [] };

describe('File plugin via generic components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the repository list with the bespoke Upload File action', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);

    render(
      <MemoryRouter>
        <FileRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('File Repositories')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Upload File' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Repository' })).toBeInTheDocument();
  });

  it('creates a repository with manifest and autopublish', async () => {
    vi.mocked(apiService.get).mockResolvedValue(emptyList as any);
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <FileRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Repository' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Repository' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'file-repo' },
    });
    fireEvent.click(within(dialog).getByLabelText('Auto-publish'));
    fireEvent.change(within(dialog).getByLabelText('Manifest'), {
      target: { value: 'MY_MANIFEST' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/repositories/file/file/', {
        name: 'file-repo',
        description: null,
        retain_repo_versions: null,
        remote: null,
        autopublish: true,
        manifest: 'MY_MANIFEST',
      });
    });
  });

  it('uploads a file into a repository from the repository page', async () => {
    const repoHref = '/pulp/api/v3/repositories/file/file/1/';
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/repositories/file/file/')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: repoHref, name: 'file-repo' }],
        } as any);
      }
      return Promise.resolve(emptyList as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({ task: '/pulp/api/v3/tasks/1/' } as any);

    render(
      <MemoryRouter>
        <FileRepository />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload File' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload File' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /repository/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'file-repo' }));

    fireEvent.change(within(dialog).getByLabelText(/relative path/i), {
      target: { value: 'files/hello.txt' },
    });

    const fileInput = within(dialog).getByRole('button', { name: 'Choose File' }).querySelector('input');
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/content/file/files/', expect.any(FormData));
    });

    const formData = vi.mocked(apiService.post).mock.calls[0][1] as FormData;
    expect(formData.get('repository')).toBe(repoHref);
    expect(formData.get('relative_path')).toBe('files/hello.txt');
    expect(formData.get('file')).toBeInstanceOf(File);
  });

  it('creates a publication with a manifest override', async () => {
    const repoHref = '/pulp/api/v3/repositories/file/file/1/';
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.startsWith('/repositories/file/file/')) {
        return Promise.resolve({
          count: 1,
          next: null,
          previous: null,
          results: [{ pulp_href: repoHref, name: 'file-repo' }],
        } as any);
      }
      return Promise.resolve(emptyList as any);
    });
    vi.mocked(apiService.post).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <PluginPublication plugin={FILE_PLUGIN} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create publication/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /create publication/i }));
    const dialog = await screen.findByRole('dialog');

    const repoInput = within(dialog).getByRole('combobox', { name: 'Repository' });
    fireEvent.keyDown(repoInput, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('file-repo'));

    fireEvent.change(within(dialog).getByLabelText('Manifest'), {
      target: { value: 'CUSTOM_MANIFEST' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/publications/file/file/', {
        repository: repoHref,
        manifest: 'CUSTOM_MANIFEST',
        checkpoint: false,
      });
    });
  });
});
