import React from 'react';
import { Container, Typography, Paper, Box, Grid } from '@mui/material';
import { Storage, Article, Cloud } from '@mui/icons-material';

export const Dashboard: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: 200,
            }}
          >
            <Storage sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6" component="div">
              RPM
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Manage RPM repositories, distributions, and publications
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: 200,
            }}
          >
            <Article sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6" component="div">
              File
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Manage file repositories, distributions, and publications
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: 200,
            }}
          >
            <Cloud sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6" component="div">
              Debian
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Manage Deb repositories, distributions, and publications
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Welcome to Pulp UI
          </Typography>
          <Typography variant="body1" paragraph>
            Pulp is a platform for managing repositories of software packages and making them available
            to consumers. This UI provides a convenient way to manage your Pulp content.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the navigation drawer on the left to explore different content types and their resources.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};
