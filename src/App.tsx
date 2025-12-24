import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { RpmDistribution } from './components/rpm/RpmDistribution';
import { RpmDistributionDetail } from './components/rpm/RpmDistributionDetail';
import { RpmRepository } from './components/rpm/RpmRepository';
import { RpmRepositoryDetail } from './components/rpm/RpmRepositoryDetail';
import { RpmRemote } from './components/rpm/RpmRemote';
import { RpmRemoteDetail } from './components/rpm/RpmRemoteDetail';
import RpmPublication from './components/rpm/RpmPublication';
import { RpmPublicationDetail } from './components/rpm/RpmPublicationDetail';
import { GenericList } from './components/common/GenericList';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rpm/distribution"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RpmDistribution />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rpm/distribution/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RpmDistributionDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rpm/publication"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RpmPublication />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rpm/publication/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RpmPublicationDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rpm/remote"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RpmRemote />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rpm/remote/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RpmRemoteDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rpm/repository"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RpmRepository />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rpm/repository/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RpmRepositoryDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/distribution"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GenericList title="File Distributions" type="Distributions" />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/publication"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GenericList title="File Publications" type="Publications" />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/remote"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GenericList title="File Remotes" type="Remotes" />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/repository"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GenericList title="File Repositories" type="Repositories" />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/debian/distribution"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GenericList title="Deb Distributions" type="Distributions" />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/debian/publication"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GenericList title="Deb Publications" type="Publications" />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/debian/remote"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GenericList title="Deb Remotes" type="Remotes" />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/debian/repository"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GenericList title="Deb Repositories" type="Repositories" />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
