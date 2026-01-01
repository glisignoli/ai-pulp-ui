import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
  FileContentFileDetail,
  FileContentFiles,
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
                    <Outlet />
                  </Layout>
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="rpm/distribution" element={<RpmDistribution />} />
              <Route path="rpm/distribution/view" element={<RpmDistributionDetail />} />
              <Route path="rpm/publication" element={<RpmPublication />} />
              <Route path="rpm/publication/view" element={<RpmPublicationDetail />} />
              <Route path="rpm/remote" element={<RpmRemote />} />
              <Route path="rpm/remote/view" element={<RpmRemoteDetail />} />
              <Route path="rpm/repository" element={<RpmRepository />} />
              <Route path="rpm/repository/view" element={<RpmRepositoryDetail />} />
              <Route path="rpm/content/packages" element={<RpmPackages />} />
              <Route path="rpm/content/packages/view" element={<RpmPackageDetail />} />

              <Route path="file/distribution" element={<FileDistribution />} />
              <Route path="file/distribution/view" element={<FileDistributionDetail />} />
              <Route path="file/content/files" element={<FileContentFiles />} />
              <Route path="file/content/files/view" element={<FileContentFileDetail />} />
              <Route path="file/publication" element={<FilePublication />} />
              <Route path="file/publication/view" element={<FilePublicationDetail />} />
              <Route path="file/remote" element={<FileRemote />} />
              <Route path="file/remote/view" element={<FileRemoteDetail />} />
              <Route path="file/repository" element={<FileRepository />} />
              <Route path="file/repository/view" element={<FileRepositoryDetail />} />

              <Route path="deb/distribution" element={<DebDistribution />} />
              <Route path="deb/distribution/view" element={<DebDistributionDetail />} />
              <Route path="deb/publication" element={<DebPublication />} />
              <Route path="deb/publication/view" element={<DebPublicationDetail />} />
              <Route path="deb/remote" element={<DebRemote />} />
              <Route path="deb/remote/view" element={<DebRemoteDetail />} />
              <Route path="deb/repository" element={<DebRepository />} />
              <Route path="deb/repository/view" element={<DebRepositoryDetail />} />
              <Route path="deb/content/packages" element={<DebPackages />} />
              <Route path="deb/content/packages/view" element={<DebPackageDetail />} />

              <Route path="tasks" element={<Tasks />} />
              <Route path="tasks/view" element={<TaskDetail />} />

              <Route path="container/distribution" element={<ContainerDistribution />} />
              <Route
                path="container/distribution/view"
                element={<ContainerDistributionDetail />}
              />
              <Route path="container/remote" element={<ContainerRemote />} />
              <Route path="container/remote/view" element={<ContainerRemoteDetail />} />
              <Route path="container/repository" element={<ContainerRepository />} />
              <Route path="container/repository/view" element={<ContainerRepositoryDetail />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
