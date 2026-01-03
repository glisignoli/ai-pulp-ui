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

import { Users } from './components/users/Users';

import { OrphansCleanup } from './components/management/OrphansCleanup';
import { Repair } from './components/management/Repair';

import { About } from './components/About';

import { ROUTES } from './constants/routes';

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
  const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route
              path={ROUTES.ROOT}
              element={
                <ProtectedRoute>
                  <Layout>
                    <Outlet />
                  </Layout>
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path={ROUTES.ABOUT} element={<About />} />
              <Route path={ROUTES.RPM.DISTRIBUTION} element={<RpmDistribution />} />
              <Route path={ROUTES.RPM.DISTRIBUTION_VIEW} element={<RpmDistributionDetail />} />
              <Route path={ROUTES.RPM.PUBLICATION} element={<RpmPublication />} />
              <Route path={ROUTES.RPM.PUBLICATION_VIEW} element={<RpmPublicationDetail />} />
              <Route path={ROUTES.RPM.REMOTE} element={<RpmRemote />} />
              <Route path={ROUTES.RPM.REMOTE_VIEW} element={<RpmRemoteDetail />} />
              <Route path={ROUTES.RPM.REPOSITORY} element={<RpmRepository />} />
              <Route path={ROUTES.RPM.REPOSITORY_VIEW} element={<RpmRepositoryDetail />} />
              <Route path={ROUTES.RPM.PACKAGES} element={<RpmPackages />} />
              <Route path={ROUTES.RPM.PACKAGES_VIEW} element={<RpmPackageDetail />} />

              <Route path={ROUTES.FILE.DISTRIBUTION} element={<FileDistribution />} />
              <Route path={ROUTES.FILE.DISTRIBUTION_VIEW} element={<FileDistributionDetail />} />
              <Route path={ROUTES.FILE.CONTENT_FILES} element={<FileContentFiles />} />
              <Route path={ROUTES.FILE.CONTENT_FILES_VIEW} element={<FileContentFileDetail />} />
              <Route path={ROUTES.FILE.PUBLICATION} element={<FilePublication />} />
              <Route path={ROUTES.FILE.PUBLICATION_VIEW} element={<FilePublicationDetail />} />
              <Route path={ROUTES.FILE.REMOTE} element={<FileRemote />} />
              <Route path={ROUTES.FILE.REMOTE_VIEW} element={<FileRemoteDetail />} />
              <Route path={ROUTES.FILE.REPOSITORY} element={<FileRepository />} />
              <Route path={ROUTES.FILE.REPOSITORY_VIEW} element={<FileRepositoryDetail />} />

              <Route path={ROUTES.DEB.DISTRIBUTION} element={<DebDistribution />} />
              <Route path={ROUTES.DEB.DISTRIBUTION_VIEW} element={<DebDistributionDetail />} />
              <Route path={ROUTES.DEB.PUBLICATION} element={<DebPublication />} />
              <Route path={ROUTES.DEB.PUBLICATION_VIEW} element={<DebPublicationDetail />} />
              <Route path={ROUTES.DEB.REMOTE} element={<DebRemote />} />
              <Route path={ROUTES.DEB.REMOTE_VIEW} element={<DebRemoteDetail />} />
              <Route path={ROUTES.DEB.REPOSITORY} element={<DebRepository />} />
              <Route path={ROUTES.DEB.REPOSITORY_VIEW} element={<DebRepositoryDetail />} />
              <Route path={ROUTES.DEB.PACKAGES} element={<DebPackages />} />
              <Route path={ROUTES.DEB.PACKAGES_VIEW} element={<DebPackageDetail />} />

              <Route path={ROUTES.TASKS.ROOT} element={<Tasks />} />
              <Route path={ROUTES.TASKS.VIEW} element={<TaskDetail />} />

              <Route path={ROUTES.CONTAINER.DISTRIBUTION} element={<ContainerDistribution />} />
              <Route
                path={ROUTES.CONTAINER.DISTRIBUTION_VIEW}
                element={<ContainerDistributionDetail />}
              />
              <Route path={ROUTES.CONTAINER.REMOTE} element={<ContainerRemote />} />
              <Route path={ROUTES.CONTAINER.REMOTE_VIEW} element={<ContainerRemoteDetail />} />
              <Route path={ROUTES.CONTAINER.REPOSITORY} element={<ContainerRepository />} />
              <Route
                path={ROUTES.CONTAINER.REPOSITORY_VIEW}
                element={<ContainerRepositoryDetail />}
              />

              <Route path={ROUTES.USERS} element={<Users />} />

              <Route path={ROUTES.MANAGEMENT.ORPHANS_CLEANUP} element={<OrphansCleanup />} />
              <Route path={ROUTES.MANAGEMENT.REPAIR} element={<Repair />} />
            </Route>
            <Route path="*" element={<Navigate to={ROUTES.ROOT} replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
