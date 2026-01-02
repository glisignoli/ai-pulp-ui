import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { Tasks } from '../components/tasks/Tasks';
import { TaskDetail } from '../components/tasks/TaskDetail';
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

const renderWithRoutes = (initialEntry: string) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/view" element={<TaskDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    (apiService.get as any).mockImplementation(() => new Promise(() => {}));
    renderWithRoutes('/tasks');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('loads and displays running tasks', async () => {
    (apiService.get as any).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/tasks/1/',
          name: 'pulp_file.app.tasks.something',
          state: 'running',
          pulp_created: '2025-01-01T00:00:00Z',
          started_at: '2025-01-01T00:00:01Z',
        },
      ],
    });

    renderWithRoutes('/tasks');

    await waitFor(() => {
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('pulp_file.app.tasks.something')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
    });

    expect(apiService.get).toHaveBeenCalledWith('/tasks/?limit=25&offset=0');
  });

  it('shows Cancel for running tasks and calls cancel endpoint', async () => {
    (apiService.get as any).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/tasks/1/',
          name: 'demo-task',
          state: 'running',
        },
      ],
    });
    (apiService.patch as any).mockResolvedValue({});

    renderWithRoutes('/tasks');

    await waitFor(() => {
      expect(screen.getByText('demo-task')).toBeInTheDocument();
    });

    const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(apiService.patch).toHaveBeenCalledWith('/pulp/api/v3/tasks/1/', { state: 'canceled' });
    });
  });

  it('shows Delete for completed tasks and deletes after confirmation', async () => {
    (apiService.get as any).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          pulp_href: '/pulp/api/v3/tasks/1/',
          name: 'completed-task',
          state: 'completed',
        },
      ],
    });
    (apiService.delete as any).mockResolvedValue({});

    renderWithRoutes('/tasks');

    await waitFor(() => {
      expect(screen.getByText('completed-task')).toBeInTheDocument();
    });

    const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(apiService.delete).toHaveBeenCalledWith('/pulp/api/v3/tasks/1/');
    });
  });

  it('filters tasks by state', async () => {
    (apiService.get as any)
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            pulp_href: '/pulp/api/v3/tasks/1/',
            name: 'demo-task',
            state: 'running',
          },
        ],
      })
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            pulp_href: '/pulp/api/v3/tasks/2/',
            name: 'failed-task',
            state: 'failed',
          },
        ],
      });

    renderWithRoutes('/tasks');

    await waitFor(() => {
      expect(screen.getByText('demo-task')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: /state/i }));
    await user.click(screen.getByRole('option', { name: 'failed' }));

    await waitFor(() => {
      expect(apiService.get).toHaveBeenLastCalledWith('/tasks/?state=failed&limit=25&offset=0');
      expect(screen.getByText('failed-task')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /state/i })).toHaveTextContent('failed');

      const failedTaskRow = screen.getByRole('row', { name: /failed-task/i });
      expect(within(failedTaskRow).getByRole('cell', { name: 'failed' })).toBeInTheDocument();
    });
  });

  it('navigates to task detail when View is clicked', async () => {
    (apiService.get as any)
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            pulp_href: '/pulp/api/v3/tasks/1/',
            name: 'pulp_file.app.tasks.something',
            state: 'running',
          },
        ],
      })
      .mockResolvedValueOnce({
        pulp_href: '/pulp/api/v3/tasks/1/',
        name: 'pulp_file.app.tasks.something',
        state: 'running',
        custom_field: 'value',
      });

    renderWithRoutes('/tasks');

    await waitFor(() => {
      expect(screen.getByText('pulp_file.app.tasks.something')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByLabelText('View');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Task Details/)).toBeInTheDocument();
      expect(screen.getByText(/custom_field/)).toBeInTheDocument();
    });
  });
});
