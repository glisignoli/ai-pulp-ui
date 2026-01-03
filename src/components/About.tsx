import React from 'react';
import { Container, Typography } from '@mui/material';

export const About: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        About
      </Typography>

      <Typography variant="body1" paragraph>
        This UI project was generated with AI assistance.
      </Typography>

      <Typography variant="body1" paragraph>
        The repository was created using VS Code and the models GPT-5.2 and Sonnet 4.5.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        For more details, see the project README.
      </Typography>
    </Container>
  );
};
