import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OrphansCleanup } from '../components/management/OrphansCleanup';
import { orphansService } from '../services/orphans';

vi.mock('../services/orphans', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/orphans')>();
  return {
    ...actual,
    orphansService: {
      ...actual.orphansService,
      cleanup: vi.fn(),
    },
  };
});

describe('OrphansCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers orphans cleanup with the documented request body', async () => {
    vi.mocked(orphansService.cleanup).mockResolvedValue({ task: '/pulp/api/v3/tasks/123/' } as any);

    render(
      <MemoryRouter>
        <OrphansCleanup />
      </MemoryRouter>
    );

    expect(
      screen.getByText(
        'The time in minutes for how long Pulp will hold orphan Content and Artifacts before they become candidates for deletion by this orphan cleanup task. This should ideally be longer than your longest running task otherwise any content created during that task could be cleaned up before the task finishes. If not specified, a default value is taken from the setting `ORPHAN_PROTECTION_TIME`.'
      )
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/content hrefs/i), {
      target: { value: '/pulp/api/v3/content/file/files/123/\n/pulp/api/v3/content/file/files/456/\n' },
    });

    fireEvent.change(screen.getByLabelText(/orphan protection time \(minutes\)/i), {
      target: { value: '15' },
    });

    fireEvent.click(screen.getByRole('button', { name: /run cleanup/i }));

    await waitFor(() => {
      expect(orphansService.cleanup).toHaveBeenCalledWith({
        content_hrefs: ['/pulp/api/v3/content/file/files/123/', '/pulp/api/v3/content/file/files/456/'],
        orphan_protection_time: 15,
      });
    });

    // Success snackbar should appear.
    const alert = await screen.findByRole('alert', { hidden: true });
    expect(alert).toHaveTextContent(/triggered successfully/i);
  });

  it('omits content_hrefs when none are provided', async () => {
    vi.mocked(orphansService.cleanup).mockResolvedValue({ task: '/pulp/api/v3/tasks/123/' } as any);

    render(
      <MemoryRouter>
        <OrphansCleanup />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/orphan protection time \(minutes\)/i), {
      target: { value: '15' },
    });

    fireEvent.click(screen.getByRole('button', { name: /run cleanup/i }));

    await waitFor(() => {
      expect(orphansService.cleanup).toHaveBeenCalledWith({
        orphan_protection_time: 15,
      });
    });
  });
});
