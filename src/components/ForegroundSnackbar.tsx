import React from 'react';
import { Alert, Snackbar } from '@mui/material';

export type ForegroundSnackbarSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ForegroundSnackbarProps {
  open: boolean;
  message: string;
  severity: ForegroundSnackbarSeverity;
  onClose: () => void;
}

export const ForegroundSnackbar: React.FC<ForegroundSnackbarProps> = ({
  open,
  message,
  severity,
  onClose,
}) => {
  return (
    <Snackbar
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
    >
      <Alert
        severity={severity}
        onClose={onClose}
        sx={{ width: '100%', whiteSpace: 'pre-wrap' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};
