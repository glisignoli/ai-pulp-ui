import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Repair } from '../components/management/Repair';
import { repairService } from '../services/repair';

vi.mock('../services/repair', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/repair')>();
  return {
    ...actual,
    repairService: {
      ...actual.repairService,
      repair: vi.fn(),
    },
  };
});

describe('Repair', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers repair with verify_checksums=true by default', async () => {
    vi.mocked(repairService.repair).mockResolvedValue({ task: '/pulp/api/v3/tasks/456/' } as any);

    render(
      <MemoryRouter>
        <Repair />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /run repair/i }));

    await waitFor(() => {
      expect(repairService.repair).toHaveBeenCalledWith({ verify_checksums: true });
    });

    const alert = await screen.findByRole('alert', { hidden: true });
    expect(alert).toHaveTextContent(/triggered successfully/i);
  });

  it('allows the user to toggle verify_checksums off', async () => {
    vi.mocked(repairService.repair).mockResolvedValue({ task: '/pulp/api/v3/tasks/789/' } as any);

    render(
      <MemoryRouter>
        <Repair />
      </MemoryRouter>
    );

    const verifyToggle = screen.getByRole('checkbox', { name: /verify checksums/i });
    expect(verifyToggle).toBeChecked();

    fireEvent.click(verifyToggle);
    expect(verifyToggle).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /run repair/i }));

    await waitFor(() => {
      expect(repairService.repair).toHaveBeenCalledWith({ verify_checksums: false });
    });
  });
});
