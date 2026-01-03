export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  ABOUT: '/about',

  USERS: '/users',

  MANAGEMENT: {
    ROOT: '/management',
    ORPHANS_CLEANUP: '/management/orphans/cleanup',
    REPAIR: '/management/repair',
  },

  RPM: {
    ROOT: '/rpm',
    DISTRIBUTION: '/rpm/distribution',
    DISTRIBUTION_VIEW: '/rpm/distribution/view',
    PUBLICATION: '/rpm/publication',
    PUBLICATION_VIEW: '/rpm/publication/view',
    REMOTE: '/rpm/remote',
    REMOTE_VIEW: '/rpm/remote/view',
    REPOSITORY: '/rpm/repository',
    REPOSITORY_VIEW: '/rpm/repository/view',
    PACKAGES: '/rpm/content/packages',
    PACKAGES_VIEW: '/rpm/content/packages/view',
  },

  FILE: {
    ROOT: '/file',
    DISTRIBUTION: '/file/distribution',
    DISTRIBUTION_VIEW: '/file/distribution/view',
    CONTENT_FILES: '/file/content/files',
    CONTENT_FILES_VIEW: '/file/content/files/view',
    PUBLICATION: '/file/publication',
    PUBLICATION_VIEW: '/file/publication/view',
    REMOTE: '/file/remote',
    REMOTE_VIEW: '/file/remote/view',
    REPOSITORY: '/file/repository',
    REPOSITORY_VIEW: '/file/repository/view',
  },

  DEB: {
    ROOT: '/deb',
    DISTRIBUTION: '/deb/distribution',
    DISTRIBUTION_VIEW: '/deb/distribution/view',
    PUBLICATION: '/deb/publication',
    PUBLICATION_VIEW: '/deb/publication/view',
    REMOTE: '/deb/remote',
    REMOTE_VIEW: '/deb/remote/view',
    REPOSITORY: '/deb/repository',
    REPOSITORY_VIEW: '/deb/repository/view',
    PACKAGES: '/deb/content/packages',
    PACKAGES_VIEW: '/deb/content/packages/view',
  },

  TASKS: {
    ROOT: '/tasks',
    VIEW: '/tasks/view',
  },

  CONTAINER: {
    ROOT: '/container',
    DISTRIBUTION: '/container/distribution',
    DISTRIBUTION_VIEW: '/container/distribution/view',
    REMOTE: '/container/remote',
    REMOTE_VIEW: '/container/remote/view',
    REPOSITORY: '/container/repository',
    REPOSITORY_VIEW: '/container/repository/view',
  },
} as const;
