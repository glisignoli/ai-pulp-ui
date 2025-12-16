import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RpmRemote } from '../components/rpm/RpmRemote';
import { apiService } from '../services/api';

vi.mock('../services/api');

describe('RpmRemote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state initially', () => {
    (apiService.get as any).mockImplementation(() => new Promise(() => {}));
    render(<RpmRemote />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('loads and displays list of remotes', async () => {
    const mockRemotes = {
      count: 2,
      results: [
        {
          pulp_href: '/pulp/api/v3/remotes/rpm/rpm/1/',
          name: 'test-remote-1',
          url: 'https://example.com/repo1',
          policy: 'immediate',
          tls_validation: true,
        },
        {
          pulp_href: '/pulp/api/v3/remotes/rpm/rpm/2/',
          name: 'test-remote-2',
          url: 'https://example.com/repo2',
          policy: 'on_demand',
          tls_validation: false,
        },
      ],
    };

    (apiService.get as any).mockResolvedValue(mockRemotes);

    render(<RpmRemote />);

    await waitFor(() => {
      expect(screen.getByText('test-remote-1')).toBeInTheDocument();
      expect(screen.getByText('test-remote-2')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/repo1')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/repo2')).toBeInTheDocument();
    });
  });

  it('shows error message when loading fails', async () => {
    (apiService.get as any).mockRejectedValue(new Error('Network error'));

    render(<RpmRemote />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load remotes')).toBeInTheDocument();
    });
  });

  it('opens create dialog when Create Remote button is clicked', async () => {
    (apiService.get as any).mockResolvedValue({ count: 0, results: [] });

    render(<RpmRemote />);

    await waitFor(() => {
      expect(screen.getByText('No remotes found')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /Create Remote/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      const dialogs = screen.getAllByText('Create Remote');
      expect(dialogs.length).toBeGreaterThan(0);
      expect(screen.getAllByRole('textbox', { name: /Name/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('textbox', { name: /^URL$/i }).length).toBeGreaterThan(0);
    });
  });

  it('creates a new remote with basic fields', async () => {
    (apiService.get as any).mockResolvedValue({ count: 0, results: [] });
    (apiService.post as any).mockResolvedValue({});

    render(<RpmRemote />);

    await waitFor(() => {
      expect(screen.getByText('No remotes found')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /Create Remote/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      const dialogs = screen.getAllByText('Create Remote');
      expect(dialogs.length).toBeGreaterThan(0);
    });

    const nameInputs = screen.getAllByRole('textbox', { name: /Name/i });
    const urlInputs = screen.getAllByRole('textbox', { name: /^URL$/i });

    fireEvent.change(nameInputs[0], { target: { value: 'new-remote' } });
    fireEvent.change(urlInputs[0], { target: { value: 'https://example.com/new-repo' } });

    const submitButton = screen.getAllByRole('button', { name: /Create/i }).find(
      (btn) => btn.closest('[role="dialog"]')
    );
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/remotes/rpm/rpm/', {
        name: 'new-remote',
        url: 'https://example.com/new-repo',
        tls_validation: true,
        policy: 'immediate',
      });
    });
  });

  it('creates a remote with authentication fields', async () => {
    (apiService.get as any).mockResolvedValue({ count: 0, results: [] });
    (apiService.post as any).mockResolvedValue({});

    render(<RpmRemote />);

    await waitFor(() => {
      expect(screen.getByText('No remotes found')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /Create Remote/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      const dialogs = screen.getAllByText('Create Remote');
      expect(dialogs.length).toBeGreaterThan(0);
    });

    const nameInputs = screen.getAllByRole('textbox', { name: /Name/i });
    const urlInputs = screen.getAllByRole('textbox', { name: /^URL$/i });
    const usernameInputs = screen.getAllByRole('textbox', { name: /Username/i });
    const passwordInput = screen.getByLabelText(/^Password$/i);

    fireEvent.change(nameInputs[0], { target: { value: 'secure-remote' } });
    fireEvent.change(urlInputs[0], { target: { value: 'https://secure.example.com/repo' } });
    fireEvent.change(usernameInputs[0], { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });

    const submitButton = screen.getAllByRole('button', { name: /Create/i }).find(
      (btn) => btn.closest('[role="dialog"]')
    );
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(apiService.post).toHaveBeenCalledWith('/remotes/rpm/rpm/', {
        name: 'secure-remote',
        url: 'https://secure.example.com/repo',
        tls_validation: true,
        policy: 'immediate',
        username: 'testuser',
        password: 'testpass',
      });
    });
  });

  it('opens edit dialog with pre-filled data', async () => {
    const mockRemotes = {
      count: 1,
      results: [
        {
          pulp_href: '/pulp/api/v3/remotes/rpm/rpm/1/',
          name: 'existing-remote',
          url: 'https://example.com/repo',
          policy: 'on_demand',
          tls_validation: false,
          download_concurrency: 10,
          max_retries: 3,
        },
      ],
    };

    (apiService.get as any).mockResolvedValue(mockRemotes);

    render(<RpmRemote />);

    await waitFor(() => {
      expect(screen.getByText('existing-remote')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Remote')).toBeInTheDocument();
      const nameInputs = screen.getAllByRole('textbox', { name: /Name/i });
      const urlInputs = screen.getAllByRole('textbox', { name: /^URL$/i });
      // Find the first enabled input (dialog input)
      const dialogNameInput = nameInputs.find(input => (input as HTMLInputElement).disabled) as HTMLInputElement;
      const dialogUrlInput = urlInputs.find(input => !(input as HTMLInputElement).hasAttribute('disabled')) as HTMLInputElement;
      expect(dialogNameInput.value).toBe('existing-remote');
      expect(dialogUrlInput.value).toBe('https://example.com/repo');
    });
  });

  it('updates an existing remote', async () => {
    const mockRemotes = {
      count: 1,
      results: [
        {
          pulp_href: '/pulp/api/v3/remotes/rpm/rpm/1/',
          name: 'existing-remote',
          url: 'https://example.com/repo',
          policy: 'immediate',
          tls_validation: true,
        },
      ],
    };

    (apiService.get as any).mockResolvedValue(mockRemotes);
    (apiService.put as any).mockResolvedValue({});

    render(<RpmRemote />);

    await waitFor(() => {
      expect(screen.getByText('existing-remote')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Remote')).toBeInTheDocument();
    });

    const urlInput = screen.getByRole('textbox', { name: /^URL$/i });
    fireEvent.change(urlInput, { target: { value: 'https://updated.example.com/repo' } });

    const updateButton = screen.getByRole('button', { name: /Update/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith('/pulp/api/v3/remotes/rpm/rpm/1/', {
        name: 'existing-remote',
        url: 'https://updated.example.com/repo',
        tls_validation: true,
        policy: 'immediate',
      });
    });
  });

  it('opens delete confirmation dialog', async () => {
    const mockRemotes = {
      count: 1,
      results: [
        {
          pulp_href: '/pulp/api/v3/remotes/rpm/rpm/1/',
          name: 'remote-to-delete',
          url: 'https://example.com/repo',
          policy: 'immediate',
          tls_validation: true,
        },
      ],
    };

    (apiService.get as any).mockResolvedValue(mockRemotes);

    render(<RpmRemote />);

    await waitFor(() => {
      expect(screen.getByText('remote-to-delete')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete the remote "remote-to-delete"/)).toBeInTheDocument();
    });
  });

  it('deletes a remote when confirmed', async () => {
    const mockRemotes = {
      count: 1,
      results: [
        {
          pulp_href: '/pulp/api/v3/remotes/rpm/rpm/1/',
          name: 'remote-to-delete',
          url: 'https://example.com/repo',
          policy: 'immediate',
          tls_validation: true,
        },
      ],
    };

    (apiService.get as any).mockResolvedValue(mockRemotes);
    (apiService.delete as any).mockResolvedValue({});

    render(<RpmRemote />);

    await waitFor(() => {
      expect(screen.getByText('remote-to-delete')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    const confirmButton = screen.getAllByRole('button', { name: /Delete/i }).find(
      (btn) => btn.closest('[role="dialog"]')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith('/pulp/api/v3/remotes/rpm/rpm/1/');
    });
  });
});
