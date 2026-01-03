import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { DEFAULT_PAGE_SIZE, formatPulpApiError, getPulpApiErrorPayload } from '../../services/api';
import type { PulpUser } from '../../types/pulp';
import { ForegroundSnackbar } from '../ForegroundSnackbar';
import { usersService, type CreateUserPayload, type UpdateUserPayload } from '../../services/users';

interface UserFormData {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
}

const emptyFormData: UserFormData = {
  username: '',
  password: '',
  first_name: '',
  last_name: '',
  email: '',
  is_staff: false,
  is_active: true,
};

export const Users: React.FC = () => {
  const [users, setUsers] = useState<PulpUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<PulpUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyFormData);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<PulpUser | null>(null);

  const fetchUsers = async (pageToLoad: number = page) => {
    try {
      setLoading(true);
      const offset = pageToLoad * DEFAULT_PAGE_SIZE;
      const response = await usersService.list(offset);
      setUsers(response.results);
      setTotalCount(response.count);
      setPage(pageToLoad);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers(0);
  }, []);

  const handlePageChange = (_event: unknown, newPage: number) => {
    void fetchUsers(newPage);
  };

  const handleOpenDialog = (user?: PulpUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username ?? '',
        password: '',
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        email: user.email ?? '',
        is_staff: !!user.is_staff,
        is_active: user.is_active ?? true,
      });
    } else {
      setEditingUser(null);
      setFormData(emptyFormData);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData(emptyFormData);
  };

  const handleFormChange = (field: keyof UserFormData, value: UserFormData[keyof UserFormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.username.trim()) {
        setError('Username is required');
        return;
      }

      if (editingUser) {
        const payload: UpdateUserPayload = {
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          is_staff: formData.is_staff,
          is_active: formData.is_active,
        };

        if (formData.password.trim()) {
          payload.password = formData.password;
        }

        await usersService.update(editingUser.pulp_href, payload);
        setSuccessMessage('User updated successfully');
      } else {
        const payload: CreateUserPayload = {
          username: formData.username,
          password: formData.password.trim() ? formData.password : null,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          is_staff: formData.is_staff,
          is_active: formData.is_active,
        };

        await usersService.create(payload);
        setSuccessMessage('User created successfully');
      }

      handleCloseDialog();
      await fetchUsers(editingUser ? page : 0);
    } catch (err) {
      // When creating a user, a 400 typically contains validation details.
      // Surface the raw API response to the user for actionable feedback.
      if (!editingUser && axios.isAxiosError(err) && err.response?.status === 400) {
        const payload = getPulpApiErrorPayload(err);
        if (payload !== undefined && payload !== null) {
          setError(typeof payload === 'string' ? payload : JSON.stringify(payload));
          return;
        }
      }

      setError(formatPulpApiError(err, `Failed to ${editingUser ? 'update' : 'create'} user`));
    }
  };

  const handleDeleteClick = (user: PulpUser) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setUserToDelete(null);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await usersService.delete(userToDelete.pulp_href);
      setSuccessMessage('User deleted successfully');
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      await fetchUsers(0);
    } catch (err) {
      setError(formatPulpApiError(err, 'Failed to delete user'));
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Users
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create User
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Staff</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.pulp_href}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.first_name}</TableCell>
                    <TableCell>{user.last_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.is_staff ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{user.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell align="right">
                      <IconButton title="Edit" onClick={() => handleOpenDialog(user)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton title="Delete" onClick={() => handleDeleteClick(user)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={DEFAULT_PAGE_SIZE}
            rowsPerPageOptions={[DEFAULT_PAGE_SIZE]}
          />
        </Paper>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Username"
            fullWidth
            value={formData.username}
            onChange={(e) => handleFormChange('username', e.target.value)}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={formData.password}
            onChange={(e) => handleFormChange('password', e.target.value)}
            helperText={editingUser ? 'Leave blank to keep existing password' : undefined}
          />
          <TextField
            margin="dense"
            label="First Name"
            fullWidth
            value={formData.first_name}
            onChange={(e) => handleFormChange('first_name', e.target.value)}
          />
          <TextField
            margin="dense"
            label="Last Name"
            fullWidth
            value={formData.last_name}
            onChange={(e) => handleFormChange('last_name', e.target.value)}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={formData.email}
            onChange={(e) => handleFormChange('email', e.target.value)}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_staff}
                onChange={(e) => handleFormChange('is_staff', e.target.checked)}
              />
            }
            label="Is Staff"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_active}
                onChange={(e) => handleFormChange('is_active', e.target.checked)}
              />
            }
            label="Is Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={cancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the user "{userToDelete?.username}"? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <ForegroundSnackbar
        open={!!successMessage}
        message={successMessage ?? ''}
        severity="success"
        autoHideDuration={5000}
        onClose={() => setSuccessMessage(null)}
      />

      <ForegroundSnackbar
        open={!!error && !loading}
        message={error ?? ''}
        severity="error"
        autoHideDuration={7000}
        onClose={() => setError(null)}
      />
    </Container>
  );
};
