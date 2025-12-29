import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
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

  it('uploads via /content/deb/packages/ with file, distribution, and component', async () => {
    const user = userEvent.setup();

    vi.mocked(apiService.get).mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    vi.mocked(apiService.post).mockResolvedValueOnce({ task: '/pulp/api/v3/tasks/123/' });

    render(
      <MemoryRouter>
        <DebPackages />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: /deb packages/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /upload package/i }));

    const dialog = screen.getByRole('dialog', { name: /upload deb package/i });
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(['deb'], 'dog.deb', { type: 'application/vnd.debian.binary-package' });
    await user.upload(fileInput, file);

    fireEvent.change(within(dialog).getByLabelText(/^distribution$/i), { target: { value: 'stable' } });
    fireEvent.change(within(dialog).getByLabelText(/^component$/i), { target: { value: 'main' } });

    await user.click(within(dialog).getByRole('button', { name: /^upload$/i }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/content/deb/packages/', expect.any(FormData));
    });

    const formData = vi.mocked(apiService.post).mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBe(file);
    expect(formData.get('distribution')).toBe('stable');
    expect(formData.get('component')).toBe('main');
  });

  it('rejects invalid pulp_labels json', async () => {
    const user = userEvent.setup();

    vi.mocked(apiService.get).mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });

    render(
      <MemoryRouter>
        <DebPackages />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: /deb packages/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /upload package/i }));
    const dialog = screen.getByRole('dialog', { name: /upload deb package/i });

    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['deb'], 'dog.deb', { type: 'application/vnd.debian.binary-package' });
    await user.upload(fileInput, file);

    fireEvent.change(within(dialog).getByLabelText(/^distribution$/i), { target: { value: 'stable' } });
    fireEvent.change(within(dialog).getByLabelText(/^component$/i), { target: { value: 'main' } });
    fireEvent.change(within(dialog).getByLabelText(/pulp labels/i), { target: { value: '{not json' } });

    await user.click(within(dialog).getByRole('button', { name: /^upload$/i }));

    expect(await screen.findByText(/invalid pulp_labels json/i)).toBeVisible();
    expect(apiService.post).not.toHaveBeenCalled();
  });
});
