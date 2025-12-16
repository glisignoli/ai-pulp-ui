import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

interface GenericListProps {
  title: string;
  type: string;
}

export const GenericList: React.FC<GenericListProps> = ({ title, type }) => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            {type} management interface
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This section will display and manage {type.toLowerCase()}.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};
