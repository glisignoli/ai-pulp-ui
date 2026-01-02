import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FileContentFiles } from '../components/file/FileContentFiles';
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
    formatPulpApiError: (_err: unknown, fallback: string) => fallback,
  };
});

describe('FileContentFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays file content list', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/content/file/files/1/',
          pulp_created: '2025-01-01T00:00:00Z',
          relative_path: 'foo/bar.txt',
          sha256: 'abc123',
        },
      ],
    } as any);

    render(
      <MemoryRouter>
        <FileContentFiles />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: /file contents/i })).toBeVisible());
    expect(screen.getByText('foo/bar.txt')).toBeInTheDocument();
    expect(vi.mocked(apiService.get)).toHaveBeenCalledWith('/content/file/files/?limit=25&offset=0');
  });

  it('validates upload requires relative_path', async () => {
    const user = userEvent.setup();

    vi.mocked(apiService.get).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(
      <MemoryRouter>
        <FileContentFiles />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: /file contents/i })).toBeVisible());

    await user.click(screen.getByRole('button', { name: /upload file/i }));
    const dialog = screen.getByRole('dialog', { name: /upload file/i });

    await user.click(within(dialog).getByRole('button', { name: /^upload$/i }));

    // Error is surfaced via the global Snackbar/Alert (outside the dialog).
    expect(await screen.findByText(/relative path is required/i)).toBeVisible();
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('uploads using /content/file/files/ with file + relative_path', async () => {
    const user = userEvent.setup();

    vi.mocked(apiService.get).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    vi.mocked(apiService.post).mockResolvedValueOnce({
      task: '/pulp/api/v3/tasks/123/',
    });

    render(
      <MemoryRouter>
        <FileContentFiles />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: /file contents/i })).toBeVisible());

    await user.click(screen.getByRole('button', { name: /upload file/i }));
    const dialog = screen.getByRole('dialog', { name: /upload file/i });

    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    await user.upload(fileInput, file);

    await user.type(within(dialog).getByLabelText(/relative path/i), 'path/hello.txt');

    // Avoid user-event brace parsing by setting value via change.
    fireEvent.change(within(dialog).getByLabelText(/pulp labels \(json\)/i), {
      target: { value: '{"env":"dev"}' },
    });

    fireEvent.change(within(dialog).getByLabelText(/^repository$/i), {
      target: { value: '/pulp/api/v3/repositories/file/file/1/' },
    });

    await user.click(within(dialog).getByRole('button', { name: /^upload$/i }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/content/file/files/', expect.any(FormData));
    });

    const formData = vi.mocked(apiService.post).mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBe(file);
    expect(formData.get('relative_path')).toBe('path/hello.txt');
    expect(formData.get('repository')).toBe('/pulp/api/v3/repositories/file/file/1/');
    expect(formData.get('pulp_labels')).toBe('{"env":"dev"}');
  });
});
