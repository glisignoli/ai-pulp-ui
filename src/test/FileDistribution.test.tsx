import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { FileDistribution } from '../components/file/FileDistribution';
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

const renderFileDistribution = () => {
  return render(
    <BrowserRouter>
      <FileDistribution />
    </BrowserRouter>
  );
};

describe('FileDistribution Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits create distribution with checkpoint and pulp_labels when provided', async () => {
    const user = userEvent.setup();

    const emptyList = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };

    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url.includes('/distributions/file/file/')) return Promise.resolve(emptyList);
      if (url.includes('/publications/file/file/')) return Promise.resolve(emptyList);
      if (url.includes('/repositories/file/file/')) return Promise.resolve(emptyList);
      return Promise.resolve(emptyList);
    });

    vi.mocked(apiService.post).mockResolvedValueOnce({ task: '/pulp/api/v3/tasks/1/' } as any);

    renderFileDistribution();

    await user.click(await screen.findByRole('button', { name: /create distribution/i }));
    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText(/name/i), 'file-dist');
    await user.type(within(dialog).getByLabelText(/base path/i), 'file/path');

    await user.click(within(dialog).getByRole('checkbox', { name: /checkpoint/i }));

    fireEvent.change(within(dialog).getByLabelText(/pulp labels/i), {
      target: { value: '{"env":"dev"}' },
    });

    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith(
        '/distributions/file/file/',
        expect.objectContaining({
          checkpoint: true,
          pulp_labels: { env: 'dev' },
        })
      );
    });
  });

  it('prevents submit when pulp_labels JSON is invalid', async () => {
    const user = userEvent.setup();

    const emptyList = {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };

    vi.mocked(apiService.get).mockResolvedValue(emptyList);

    renderFileDistribution();

    await user.click(await screen.findByRole('button', { name: /create distribution/i }));
    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText(/name/i), 'file-dist');
    await user.type(within(dialog).getByLabelText(/base path/i), 'file/path');

    // values must be strings, so this should be rejected
    fireEvent.change(within(dialog).getByLabelText(/pulp labels/i), {
      target: { value: '{"k": 1}' },
    });

    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid pulp_labels json/i)).toBeInTheDocument();
    });

    expect(apiService.post).not.toHaveBeenCalled();
  });
});
