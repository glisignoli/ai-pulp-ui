import { Fragment } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { RpmPackages } from './components/rpm/RpmPackages';
import { RpmPackageDetail } from './components/rpm/RpmPackageDetail';
import { DebPackages } from './components/deb/DebPackages';
import { DebPackageDetail } from './components/deb/DebPackageDetail';
import { Tasks } from './components/tasks/Tasks';
import { TaskDetail } from './components/tasks/TaskDetail';
import { FileRepository, FileContentFiles, FileContentFileDetail } from './components/file';

import {
  PluginDistribution,
  PluginPublication,
  PluginRemote,
  PluginRepository,
  PluginResourceDetail,
} from './components/plugin';

import { Users } from './components/users/Users';

import { OrphansCleanup } from './components/management/OrphansCleanup';
import { Repair } from './components/management/Repair';

import { About } from './components/About';

import { ROUTES } from './constants/routes';
import {
  CONTAINER_PLUGIN,
  CONTAINER_PULL_THROUGH_PLUGIN,
  CONTENT_PLUGINS,
  DEB_PLUGIN,
  FILE_PLUGIN,
  RPM_PLUGIN,
  pluginRoutePaths,
} from './constants/plugins';
import type { PluginConfig } from './constants/plugins';

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

/** Repository/remote/distribution/publication routes shared by every plugin. */
const pluginResourceRoutes = (plugin: PluginConfig, repositoryElement?: React.ReactNode) => {
  const paths = pluginRoutePaths(plugin);
  return (
    <Fragment key={plugin.key}>
      <Route path={paths.distribution} element={<PluginDistribution plugin={plugin} />} />
      <Route
        path={paths.distributionView}
        element={<PluginResourceDetail plugin={plugin} resource="distribution" />}
      />
      {plugin.endpoints.publications ? (
        <>
          <Route path={paths.publication} element={<PluginPublication plugin={plugin} />} />
          <Route
            path={paths.publicationView}
            element={<PluginResourceDetail plugin={plugin} resource="publication" />}
          />
        </>
      ) : null}
      <Route path={paths.remote} element={<PluginRemote plugin={plugin} />} />
      <Route
        path={paths.remoteView}
        element={<PluginResourceDetail plugin={plugin} resource="remote" />}
      />
      <Route
        path={paths.repository}
        element={repositoryElement ?? <PluginRepository plugin={plugin} />}
      />
      <Route
        path={paths.repositoryView}
        element={<PluginResourceDetail plugin={plugin} resource="repository" />}
      />
    </Fragment>
  );
};

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

              {pluginResourceRoutes(RPM_PLUGIN)}
              <Route path={ROUTES.RPM.PACKAGES} element={<RpmPackages />} />
              <Route path={ROUTES.RPM.PACKAGES_VIEW} element={<RpmPackageDetail />} />

              {pluginResourceRoutes(FILE_PLUGIN, <FileRepository />)}
              <Route path={ROUTES.FILE.CONTENT_FILES} element={<FileContentFiles />} />
              <Route path={ROUTES.FILE.CONTENT_FILES_VIEW} element={<FileContentFileDetail />} />

              {pluginResourceRoutes(DEB_PLUGIN)}
              <Route path={ROUTES.DEB.PACKAGES} element={<DebPackages />} />
              <Route path={ROUTES.DEB.PACKAGES_VIEW} element={<DebPackageDetail />} />

              <Route path={ROUTES.TASKS.ROOT} element={<Tasks />} />
              <Route path={ROUTES.TASKS.VIEW} element={<TaskDetail />} />

              {pluginResourceRoutes(CONTAINER_PLUGIN)}
              <Route
                path={ROUTES.CONTAINER.PULL_THROUGH_DISTRIBUTION}
                element={<PluginDistribution plugin={CONTAINER_PULL_THROUGH_PLUGIN} />}
              />
              <Route
                path={ROUTES.CONTAINER.PULL_THROUGH_DISTRIBUTION_VIEW}
                element={<PluginResourceDetail plugin={CONTAINER_PULL_THROUGH_PLUGIN} resource="distribution" />}
              />
              <Route
                path={ROUTES.CONTAINER.PULL_THROUGH_REMOTE}
                element={<PluginRemote plugin={CONTAINER_PULL_THROUGH_PLUGIN} />}
              />
              <Route
                path={ROUTES.CONTAINER.PULL_THROUGH_REMOTE_VIEW}
                element={<PluginResourceDetail plugin={CONTAINER_PULL_THROUGH_PLUGIN} resource="remote" />}
              />

              {CONTENT_PLUGINS.map((plugin) => pluginResourceRoutes(plugin))}

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
