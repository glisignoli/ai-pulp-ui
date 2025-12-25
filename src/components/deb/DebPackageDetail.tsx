import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { DebPackage } from '../../types/pulp';

export const DebPackageDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const href = searchParams.get('href') || '';

  const [pkg, setPkg] = useState<DebPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackage = async () => {
      if (!href) {
        setError('Missing package href');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await apiService.get<DebPackage>(href);
        setPkg(result);
        setError(null);
      } catch {
        setError('Failed to load package');
      } finally {
        setLoading(false);
      }
    };

    void fetchPackage();
  }, [href]);

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!pkg) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error || 'Package not found'}</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/deb/content/packages')}>
          Back to Packages
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Package Details</Typography>
        <Button variant="outlined" onClick={() => navigate('/deb/content/packages')}>
          Back
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Package Information
        </Typography>
        <TableContainer>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 'bold', width: '30%' }}>
                  Package
                </TableCell>
                <TableCell>{pkg.package}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                  Version
                </TableCell>
                <TableCell>{pkg.version}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                  Architecture
                </TableCell>
                <TableCell>{pkg.architecture}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                  Pulp Href
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {pkg.pulp_href}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                  Created
                </TableCell>
                <TableCell>{pkg.pulp_created ? new Date(pkg.pulp_created).toLocaleString() : 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                  Maintainer
                </TableCell>
                <TableCell>{pkg.maintainer || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                  Section
                </TableCell>
                <TableCell>{pkg.section || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                  Description
                </TableCell>
                <TableCell>{pkg.description || 'N/A'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};
