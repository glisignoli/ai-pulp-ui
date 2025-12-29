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
import { RpmPackages } from './components/rpm/RpmPackages';
import { RpmPackageDetail } from './components/rpm/RpmPackageDetail';
import { DebDistribution } from './components/deb/DebDistribution';
import { DebDistributionDetail } from './components/deb/DebDistributionDetail';
import { DebRemote } from './components/deb/DebRemote';
import { DebRemoteDetail } from './components/deb/DebRemoteDetail';
import { DebRepository } from './components/deb/DebRepository';
import { DebRepositoryDetail } from './components/deb/DebRepositoryDetail';
import DebPublication from './components/deb/DebPublication';
import { DebPublicationDetail } from './components/deb/DebPublicationDetail';
import { DebPackages } from './components/deb/DebPackages';
import { DebPackageDetail } from './components/deb/DebPackageDetail';
import { Tasks } from './components/tasks/Tasks';
import { TaskDetail } from './components/tasks/TaskDetail';
import {
  FileDistribution,
  FileDistributionDetail,
  FilePublication,
  FilePublicationDetail,
  FileRemote,
  FileRemoteDetail,
  FileRepository,
  FileRepositoryDetail,
} from './components/file';

import {
  ContainerDistribution,
  ContainerDistributionDetail,
  ContainerRemote,
  ContainerRemoteDetail,
  ContainerRepository,
  ContainerRepositoryDetail,
} from './components/container';

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
              path="/rpm/content/packages"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RpmPackages />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rpm/content/packages/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RpmPackageDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/distribution"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FileDistribution />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/distribution/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FileDistributionDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/publication"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FilePublication />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/publication/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FilePublicationDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/remote"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FileRemote />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/remote/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FileRemoteDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/repository"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FileRepository />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/file/repository/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FileRepositoryDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deb/distribution"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DebDistribution />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deb/distribution/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DebDistributionDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deb/publication"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DebPublication />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deb/publication/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DebPublicationDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deb/remote"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DebRemote />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deb/remote/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DebRemoteDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deb/repository"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DebRepository />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deb/repository/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DebRepositoryDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deb/content/packages"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DebPackages />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/deb/content/packages/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DebPackageDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Tasks />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/container/distribution"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ContainerDistribution />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/container/distribution/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ContainerDistributionDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/container/remote"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ContainerRemote />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/container/remote/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ContainerRemoteDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/container/repository"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ContainerRepository />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/container/repository/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ContainerRepositoryDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/view"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TaskDetail />
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
