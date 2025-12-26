import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { RpmPackages } from '../components/rpm/RpmPackages';
import { apiService } from '../services/api';

vi.mock('../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const renderRpmPackages = () => {
  return render(
    <BrowserRouter>
      <RpmPackages />
    </BrowserRouter>
  );
};

describe('RpmPackages Component', () => {
  beforeEach(() => {
    vi.mocked(apiService.get).mockReset();
    vi.mocked(apiService.post).mockReset();
    vi.mocked(apiService.put).mockReset();
    vi.mocked(apiService.delete).mockReset();
  });

  it('uploads via /content/rpm/packages/upload/ by default', async () => {
    const user = userEvent.setup();

    vi.mocked(apiService.get).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    vi.mocked(apiService.post).mockResolvedValueOnce({
      pulp_href: '/pulp/api/v3/content/rpm/packages/1/',
      name: 'dog',
      version: '1',
      release: '1',
      arch: 'noarch',
    });

    renderRpmPackages();

    await waitFor(() => expect(screen.getByRole('heading', { name: /rpm packages/i })).toBeVisible());

    await user.click(screen.getByRole('button', { name: /upload package/i }));

    const dialog = screen.getByRole('dialog', { name: /upload rpm package/i });
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(['rpm'], 'dog.rpm', { type: 'application/x-rpm' });
    await user.upload(fileInput, file);

    await user.click(within(dialog).getByRole('button', { name: /^upload$/i }));

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/content/rpm/packages/upload/', expect.any(FormData));
    });

    const formData = vi.mocked(apiService.post).mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBe(file);
  });

  it('uses /content/rpm/packages/ when repository or relative_path is set', async () => {
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

    renderRpmPackages();

    await waitFor(() => expect(screen.getByRole('heading', { name: /rpm packages/i })).toBeVisible());

    await user.click(screen.getByRole('button', { name: /upload package/i }));

    const dialog = screen.getByRole('dialog', { name: /upload rpm package/i });

    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['rpm'], 'dog.rpm', { type: 'application/x-rpm' });
    await user.upload(fileInput, file);

    fireEvent.change(within(dialog).getByLabelText(/^repository$/i), {
      target: { value: '/pulp/api/v3/repositories/rpm/rpm/1/' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^relative path$/i), {
      target: { value: 'packages/dog.rpm' },
    });
    const pulpLabelsInput = within(dialog).getByLabelText(/pulp labels/i);
    fireEvent.change(pulpLabelsInput, { target: { value: '{"env":"dev"}' } });

    await user.click(within(dialog).getByRole('button', { name: /^upload$/i }));

    await waitFor(() => expect(apiService.post).toHaveBeenCalled());
    expect(apiService.post).toHaveBeenCalledWith('/content/rpm/packages/', expect.any(FormData));

    const formData = vi.mocked(apiService.post).mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBe(file);
    expect(formData.get('repository')).toBe('/pulp/api/v3/repositories/rpm/rpm/1/');
    expect(formData.get('relative_path')).toBe('packages/dog.rpm');
    expect(formData.get('pulp_labels')).toBe('{"env":"dev"}');
  });

  it('rejects invalid pulp_labels json', async () => {
    const user = userEvent.setup();

    vi.mocked(apiService.get).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    renderRpmPackages();

    await waitFor(() => expect(screen.getByRole('heading', { name: /rpm packages/i })).toBeVisible());

    await user.click(screen.getByRole('button', { name: /upload package/i }));

    const dialog = screen.getByRole('dialog', { name: /upload rpm package/i });
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['rpm'], 'dog.rpm', { type: 'application/x-rpm' });
    await user.upload(fileInput, file);

    const pulpLabelsInput = within(dialog).getByLabelText(/pulp labels/i);
    fireEvent.change(pulpLabelsInput, { target: { value: '{not json' } });
    await user.click(within(dialog).getByRole('button', { name: /^upload$/i }));

    expect(await screen.findByText(/invalid pulp_labels json/i)).toBeVisible();
    expect(apiService.post).not.toHaveBeenCalled();
  });
});
