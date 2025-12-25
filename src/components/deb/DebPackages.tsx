import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { DebPackage, PulpListResponse } from '../../types/pulp';

export const DebPackages: React.FC = () => {
  const navigate = useNavigate();

  const [packages, setPackages] = useState<DebPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<PulpListResponse<DebPackage>>('/content/deb/packages/?limit=100');
      setPackages(response?.results || []);
      setError(null);
    } catch {
      setError('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPackages();
  }, []);

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">DEB Packages</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Package</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Architecture</TableCell>
              <TableCell>Section</TableCell>
              <TableCell>Maintainer</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No packages found
                </TableCell>
              </TableRow>
            ) : (
              packages.map((pkg) => (
                <TableRow key={pkg.pulp_href}>
                  <TableCell>{pkg.package}</TableCell>
                  <TableCell>{pkg.version}</TableCell>
                  <TableCell>{pkg.architecture}</TableCell>
                  <TableCell>{pkg.section || 'N/A'}</TableCell>
                  <TableCell>{pkg.maintainer || 'N/A'}</TableCell>
                  <TableCell>{pkg.pulp_created ? new Date(pkg.pulp_created).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => navigate(`/deb/content/packages/view?href=${encodeURIComponent(pkg.pulp_href)}`)}
                      aria-label="view"
                      title="View"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};
