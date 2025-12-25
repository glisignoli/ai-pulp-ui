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
import { RpmPackage } from '../../types/pulp';

export const RpmPackageDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const href = searchParams.get('href') || '';

  const [pkg, setPkg] = useState<RpmPackage | null>(null);
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
        const result = await apiService.get<RpmPackage>(href);
        setPkg(result);
        setError(null);
      } catch (err) {
        setError('Failed to load package');
      } finally {
        setLoading(false);
      }
    };

    fetchPackage();
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
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/rpm/content/packages')}>
          Back to Packages
        </Button>
      </Container>
    );
  }

  const evr = `${pkg.epoch ? `${pkg.epoch}:` : ''}${pkg.version}-${pkg.release}`;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Package Details</Typography>
        <Button variant="outlined" onClick={() => navigate('/rpm/content/packages')}>
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
                  Name
                </TableCell>
                <TableCell>{pkg.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                  EVR
                </TableCell>
                <TableCell>{evr}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                  Arch
                </TableCell>
                <TableCell>{pkg.arch}</TableCell>
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
                  Summary
                </TableCell>
                <TableCell>{pkg.summary || 'N/A'}</TableCell>
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
