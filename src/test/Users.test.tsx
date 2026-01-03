import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Users } from '../components/users/Users';
import { usersService } from '../services/users';

vi.mock('../services/users', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/users')>();
  return {
    ...actual,
    usersService: {
      ...actual.usersService,
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockUsers = [
  {
    pulp_href: '/pulp/api/v3/users/1/',
    id: 1,
    username: 'user1',
    first_name: 'User',
    last_name: 'One',
    email: 'user1@example.com',
    is_staff: false,
    is_active: true,
  },
  {
    pulp_href: '/pulp/api/v3/users/2/',
    id: 2,
    username: 'user2',
    first_name: 'User',
    last_name: 'Two',
    email: 'user2@example.com',
    is_staff: true,
    is_active: false,
  },
];

describe('Users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(usersService.list).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders users after loading', async () => {
    vi.mocked(usersService.list).mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: mockUsers as any,
    });

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });

  it('opens create dialog when Create User button is clicked', async () => {
    vi.mocked(usersService.list).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });
  });

  it('creates a new user', async () => {
    vi.mocked(usersService.list).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    vi.mocked(usersService.create).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'new-user' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw-123' } });
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new-user@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(usersService.create).toHaveBeenCalledWith({
        username: 'new-user',
        password: 'pw-123',
        first_name: 'New',
        last_name: 'User',
        email: 'new-user@example.com',
        is_staff: false,
        is_active: true,
      });
    });
  });

  it('shows backend 400 response when create fails', async () => {
    vi.mocked(usersService.list).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });

    const axiosLike400Error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          username: ['This field must be unique.'],
        },
      },
      message: 'Request failed with status code 400',
      toJSON: () => ({}),
    } as any;

    vi.mocked(usersService.create).mockRejectedValue(axiosLike400Error);

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'user1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    const alert = await screen.findByRole('alert', { hidden: true });
    expect(alert).toHaveTextContent(/must be unique/i);
  });

  it('updates an existing user', async () => {
    vi.mocked(usersService.list).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [mockUsers[0]] as any,
    });
    vi.mocked(usersService.update).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Edit'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(usersService.update).toHaveBeenCalledWith('/pulp/api/v3/users/1/', {
        username: 'user1',
        first_name: 'Updated',
        last_name: 'One',
        email: 'user1@example.com',
        is_staff: false,
        is_active: true,
      });
    });
  });

  it('deletes a user after confirmation', async () => {
    vi.mocked(usersService.list).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [mockUsers[0]] as any,
    });
    vi.mocked(usersService.delete).mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Delete'));

    const confirm = await screen.findByRole('dialog');
    expect(confirm).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(usersService.delete).toHaveBeenCalledWith('/pulp/api/v3/users/1/');
    });
  });
});
