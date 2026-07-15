export type RemotePolicy = 'immediate' | 'on_demand' | 'streamed';

export type PluginFieldType =
  | 'text'
  | 'password'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiline'
  /** JSON object entered as text, e.g. gem includes or rpm repo_config. */
  | 'json'
  /** Array of strings entered one per line (or comma/space separated). */
  | 'stringlist';

export interface PluginField {
  /** API field name. */
  key: string;
  label: string;
  type: PluginFieldType;
  required?: boolean;
  helperText?: string;
  /** Choices for 'select' fields (raw API values). */
  options?: readonly string[];
  /** Initial value in the create dialog (booleans default to unchecked). */
  defaultValue?: string | number | boolean;
  /** 'number' fields accept decimals when true (default: integers). */
  float?: boolean;
  /** Minimum accepted value for 'number' fields. */
  min?: number;
}

export interface PluginResourceColumn {
  /** API field to show. */
  key: string;
  label: string;
  /** Render the value as Yes/No. */
  boolean?: boolean;
}

export interface PluginEndpoints {
  repositories: string;
  remotes: string;
  distributions: string;
  /** Only present for plugins that use publications. */
  publications?: string;
}

export interface PluginConfig {
  /** Stable identifier, e.g. 'gem' */
  key: string;
  /** Display name, e.g. 'Gem' */
  label: string;
  /** Route prefix, e.g. '/gem' */
  routeBase: string;
  endpoints: PluginEndpoints;
  /** Whether POST {repository_href}sync/ exists (all except Maven, which is a pull-through cache). */
  hasSync: boolean;
  /** Download policies accepted by this plugin's remote. */
  remotePolicies: readonly RemotePolicy[];
  /** Whether the distribution accepts a `remote` href (pull-through caching). */
  hasPullThrough: boolean;
  /**
   * Plugin-specific form fields beyond the common pulpcore set, per resource
   * type. Field names, requiredness, and enums verified against the pinned
   * Pulp OpenAPI schema (see .pulp_version).
   */
  remoteFields?: readonly PluginField[];
  repositoryFields?: readonly PluginField[];
  distributionFields?: readonly PluginField[];
  publicationFields?: readonly PluginField[];
  /** Extra list columns for plugin-specific fields worth surfacing. */
  remoteColumns?: readonly PluginResourceColumn[];
  distributionColumns?: readonly PluginResourceColumn[];
}

const RPM_CHECKSUM_TYPES = ['unknown', 'md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'] as const;
const RPM_COMPRESSION_TYPES = ['zstd', 'gz', 'none'] as const;
const RPM_LAYOUTS = ['nested_alphabetically', 'flat', 'nested_by_digest'] as const;

/**
 * Content plugins rendered with the generic components in src/components/plugin/.
 * Endpoints verified against https://pulpproject.org/pulp_<plugin>/restapi/.
 */
export const CONTENT_PLUGINS: readonly PluginConfig[] = [
  {
    key: 'ansible',
    label: 'Ansible',
    routeBase: '/ansible',
    endpoints: {
      repositories: '/repositories/ansible/ansible/',
      // pulp_ansible also has role and git remotes; the UI manages collection remotes.
      remotes: '/remotes/ansible/collection/',
      distributions: '/distributions/ansible/ansible/',
    },
    hasSync: true,
    remotePolicies: ['immediate'],
    hasPullThrough: false,
    remoteFields: [
      {
        key: 'requirements_file',
        label: 'Requirements File',
        type: 'multiline',
        helperText: 'The string version of Collection requirements yaml',
      },
      {
        key: 'auth_url',
        label: 'Auth URL',
        type: 'text',
        helperText: 'The URL to receive a session token from, e.g. used with Automation Hub',
      },
      {
        key: 'token',
        label: 'Token',
        type: 'password',
        helperText: 'The token key to use for authentication',
      },
      {
        key: 'sync_dependencies',
        label: 'Sync Dependencies',
        type: 'boolean',
        helperText: 'Sync dependencies for collections specified via requirements file',
      },
      {
        key: 'signed_only',
        label: 'Signed Only',
        type: 'boolean',
        helperText: 'Sync only collections that have a signature',
      },
    ],
    repositoryFields: [
      {
        key: 'gpgkey',
        label: 'GPG Key',
        type: 'multiline',
        helperText: 'Gpg public key to verify collection signatures against',
      },
      { key: 'private', label: 'Private', type: 'boolean' },
    ],
  },
  {
    key: 'gem',
    label: 'Gem',
    routeBase: '/gem',
    endpoints: {
      repositories: '/repositories/gem/gem/',
      remotes: '/remotes/gem/gem/',
      distributions: '/distributions/gem/gem/',
      publications: '/publications/gem/gem/',
    },
    hasSync: true,
    remotePolicies: ['immediate', 'on_demand', 'streamed'],
    hasPullThrough: true,
    remoteFields: [
      {
        key: 'prereleases',
        label: 'Prereleases',
        type: 'boolean',
        helperText: 'Whether to include prerelease versions in the sync',
      },
      {
        key: 'includes',
        label: 'Includes (JSON)',
        type: 'json',
        helperText: 'JSON object of gem names to version specifiers to include, e.g. {"rake": ">=13.0"}',
      },
      {
        key: 'excludes',
        label: 'Excludes (JSON)',
        type: 'json',
        helperText: 'JSON object of gem names to version specifiers to exclude',
      },
    ],
  },
  {
    key: 'hugging_face',
    label: 'Hugging Face',
    routeBase: '/hugging-face',
    endpoints: {
      repositories: '/repositories/hugging_face/hugging-face/',
      remotes: '/remotes/hugging_face/hugging-face/',
      distributions: '/distributions/hugging_face/hugging-face/',
      publications: '/publications/hugging_face/hugging-face/',
    },
    hasSync: true,
    remotePolicies: ['immediate', 'on_demand', 'streamed'],
    hasPullThrough: true,
    remoteFields: [
      {
        key: 'hf_hub_url',
        label: 'HF Hub URL',
        type: 'text',
        helperText: 'Base URL for Hugging Face Hub (default: https://huggingface.co)',
      },
      {
        key: 'hf_token',
        label: 'HF Token',
        type: 'password',
        helperText: 'Hugging Face authentication token for private repositories',
      },
    ],
  },
  {
    key: 'maven',
    label: 'Maven',
    routeBase: '/maven',
    endpoints: {
      repositories: '/repositories/maven/maven/',
      remotes: '/remotes/maven/maven/',
      distributions: '/distributions/maven/maven/',
    },
    hasSync: false,
    remotePolicies: ['immediate'],
    hasPullThrough: true,
  },
  {
    key: 'npm',
    label: 'NPM',
    routeBase: '/npm',
    endpoints: {
      repositories: '/repositories/npm/npm/',
      remotes: '/remotes/npm/npm/',
      distributions: '/distributions/npm/npm/',
    },
    hasSync: true,
    remotePolicies: ['immediate', 'on_demand', 'streamed'],
    hasPullThrough: true,
  },
  {
    key: 'ostree',
    label: 'OSTree',
    routeBase: '/ostree',
    endpoints: {
      repositories: '/repositories/ostree/ostree/',
      remotes: '/remotes/ostree/ostree/',
      distributions: '/distributions/ostree/ostree/',
    },
    hasSync: true,
    remotePolicies: ['immediate', 'on_demand'],
    hasPullThrough: false,
    remoteFields: [
      {
        key: 'depth',
        label: 'Depth',
        type: 'number',
        min: 0,
        helperText: 'An option to specify how many commits to traverse (0 = only the latest commit)',
      },
      {
        key: 'include_refs',
        label: 'Include Refs',
        type: 'stringlist',
        helperText: 'Refs to include during the sync, one per line',
      },
      {
        key: 'exclude_refs',
        label: 'Exclude Refs',
        type: 'stringlist',
        helperText: 'Refs to exclude during the sync, one per line',
      },
    ],
    repositoryFields: [
      {
        key: 'compute_delta',
        label: 'Compute Delta',
        type: 'boolean',
        defaultValue: true,
        helperText: 'Compute static deltas between the last two repository versions',
      },
    ],
  },
  {
    key: 'python',
    label: 'Python',
    routeBase: '/python',
    endpoints: {
      repositories: '/repositories/python/python/',
      remotes: '/remotes/python/python/',
      distributions: '/distributions/python/pypi/',
      publications: '/publications/python/pypi/',
    },
    hasSync: true,
    remotePolicies: ['immediate', 'on_demand', 'streamed'],
    hasPullThrough: true,
    remoteFields: [
      {
        key: 'includes',
        label: 'Includes',
        type: 'stringlist',
        helperText: 'Project specifiers for Python packages to include, one per line (e.g. django~=4.0)',
      },
      {
        key: 'excludes',
        label: 'Excludes',
        type: 'stringlist',
        helperText: 'Project specifiers for Python packages to exclude, one per line',
      },
      {
        key: 'prereleases',
        label: 'Prereleases',
        type: 'boolean',
        helperText: 'Whether or not to include pre-release packages in the sync',
      },
      {
        key: 'keep_latest_packages',
        label: 'Keep Latest Packages',
        type: 'number',
        min: 0,
        helperText: 'The amount of latest versions of a package to keep on sync (0 keeps all)',
      },
    ],
    repositoryFields: [
      {
        key: 'autopublish',
        label: 'Auto-publish',
        type: 'boolean',
        helperText: 'Automatically create publications for new repository versions',
      },
      {
        key: 'allow_package_substitution',
        label: 'Allow Package Substitution',
        type: 'boolean',
        defaultValue: true,
        helperText: 'Allow replacing existing packages with packages of the same name and version',
      },
    ],
    distributionFields: [
      {
        key: 'allow_uploads',
        label: 'Allow Uploads',
        type: 'boolean',
        defaultValue: true,
        helperText: 'Allow packages to be uploaded to this index',
      },
    ],
  },
  {
    key: 'rust',
    label: 'Rust',
    routeBase: '/rust',
    endpoints: {
      repositories: '/repositories/rust/rust/',
      remotes: '/remotes/rust/rust/',
      distributions: '/distributions/rust/rust/',
    },
    hasSync: true,
    remotePolicies: ['immediate', 'on_demand', 'streamed'],
    hasPullThrough: true,
  },
];

/**
 * The four plugins with dedicated nav sections (they add content pages such as
 * RPM/DEB packages and file contents, which stay bespoke components). Their
 * repository/remote/distribution/publication pages use the same generic
 * config-driven components as CONTENT_PLUGINS; they are kept out of that list
 * so App.tsx and NavigationDrawer.tsx can wire their extra routes explicitly.
 */
export const RPM_PLUGIN: PluginConfig = {
  key: 'rpm',
  label: 'RPM',
  routeBase: '/rpm',
  endpoints: {
    repositories: '/repositories/rpm/rpm/',
    remotes: '/remotes/rpm/rpm/',
    distributions: '/distributions/rpm/rpm/',
    publications: '/publications/rpm/rpm/',
  },
  hasSync: true,
  remotePolicies: ['immediate', 'on_demand', 'streamed'],
  hasPullThrough: false,
  remoteFields: [
    {
      key: 'sles_auth_token',
      label: 'SLES Auth Token',
      type: 'password',
      helperText: 'Authentication token for SLES repositories',
    },
  ],
  repositoryFields: [
    {
      key: 'autopublish',
      label: 'Auto-publish',
      type: 'boolean',
      helperText: 'Automatically create publications for new repository versions',
    },
    {
      key: 'retain_package_versions',
      label: 'Retain Package Versions',
      type: 'number',
      min: 0,
      helperText: 'Number of versions of each package to keep; older versions are purged (0 keeps all)',
    },
    {
      key: 'checksum_type',
      label: 'Checksum Type',
      type: 'select',
      options: RPM_CHECKSUM_TYPES,
      helperText: 'The preferred checksum type during repo publish',
    },
    {
      key: 'compression_type',
      label: 'Compression Type',
      type: 'select',
      options: RPM_COMPRESSION_TYPES,
      helperText: 'The compression type to use for metadata files',
    },
    {
      key: 'layout',
      label: 'Layout',
      type: 'select',
      options: RPM_LAYOUTS,
      helperText: 'How to layout the packages within the published repository',
    },
    {
      key: 'metadata_signing_service',
      label: 'Metadata Signing Service',
      type: 'text',
      helperText: 'href of an associated signing service',
    },
    {
      key: 'package_signing_service',
      label: 'Package Signing Service',
      type: 'text',
      helperText: 'href of an associated package signing service',
    },
    {
      key: 'package_signing_fingerprint',
      label: 'Package Signing Fingerprint',
      type: 'text',
      helperText: "The pubkey fingerprint to be passed to the package signing service, e.g. 'v4:<hex>'",
    },
    {
      key: 'repo_config',
      label: 'Repo Config (JSON)',
      type: 'json',
      helperText: 'A JSON document describing the config.repo file Pulp should generate for this repo',
    },
  ],
  distributionFields: [
    {
      key: 'generate_repo_config',
      label: 'Generate Repo Config',
      type: 'boolean',
      helperText: 'Whether Pulp should generate *.repo files',
    },
    { key: 'checkpoint', label: 'Checkpoint', type: 'boolean' },
  ],
  publicationFields: [
    { key: 'checkpoint', label: 'Checkpoint', type: 'boolean' },
    {
      key: 'checksum_type',
      label: 'Checksum Type',
      type: 'select',
      options: RPM_CHECKSUM_TYPES,
      helperText: 'The preferred checksum type used during repo publishes',
    },
    {
      key: 'compression_type',
      label: 'Compression Type',
      type: 'select',
      options: RPM_COMPRESSION_TYPES,
      helperText: 'The compression type to use for metadata files',
    },
    {
      key: 'layout',
      label: 'Layout',
      type: 'select',
      options: RPM_LAYOUTS,
      helperText: 'How to layout the packages within the published repository',
    },
    {
      key: 'repo_config',
      label: 'Repo Config (JSON)',
      type: 'json',
      helperText: 'A JSON document describing the config.repo file Pulp should generate',
    },
  ],
};

export const FILE_PLUGIN: PluginConfig = {
  key: 'file',
  label: 'File',
  routeBase: '/file',
  endpoints: {
    repositories: '/repositories/file/file/',
    remotes: '/remotes/file/file/',
    distributions: '/distributions/file/file/',
    publications: '/publications/file/file/',
  },
  hasSync: true,
  remotePolicies: ['immediate', 'on_demand', 'streamed'],
  hasPullThrough: false,
  repositoryFields: [
    {
      key: 'autopublish',
      label: 'Auto-publish',
      type: 'boolean',
      helperText: 'Automatically create publications for new repository versions',
    },
    {
      key: 'manifest',
      label: 'Manifest',
      type: 'text',
      helperText: 'Manifest file name (default: PULP_MANIFEST)',
    },
  ],
  distributionFields: [{ key: 'checkpoint', label: 'Checkpoint', type: 'boolean' }],
  publicationFields: [
    {
      key: 'manifest',
      label: 'Manifest',
      type: 'text',
      helperText: 'Manifest file name (default: PULP_MANIFEST)',
    },
    { key: 'checkpoint', label: 'Checkpoint', type: 'boolean' },
  ],
};

export const DEB_PLUGIN: PluginConfig = {
  key: 'deb',
  label: 'DEB',
  routeBase: '/deb',
  endpoints: {
    repositories: '/repositories/deb/apt/',
    remotes: '/remotes/deb/apt/',
    distributions: '/distributions/deb/apt/',
    publications: '/publications/deb/apt/',
  },
  hasSync: true,
  remotePolicies: ['immediate', 'on_demand', 'streamed'],
  hasPullThrough: false,
  remoteFields: [
    {
      key: 'distributions',
      label: 'Distributions',
      type: 'text',
      required: true,
      helperText: 'Whitespace separated list of distributions to sync, e.g. "stable bookworm"',
    },
    {
      key: 'components',
      label: 'Components',
      type: 'text',
      helperText: 'Whitespace separated list of components to sync (default: all)',
    },
    {
      key: 'architectures',
      label: 'Architectures',
      type: 'text',
      helperText: 'Whitespace separated list of architectures to sync (default: all)',
    },
    { key: 'sync_sources', label: 'Sync Sources', type: 'boolean', helperText: 'Sync source packages' },
    { key: 'sync_udebs', label: 'Sync Udebs', type: 'boolean', helperText: 'Sync installer packages' },
    {
      key: 'sync_installer',
      label: 'Sync Installer',
      type: 'boolean',
      helperText: 'Sync installer files',
    },
    {
      key: 'gpgkey',
      label: 'GPG Key',
      type: 'multiline',
      helperText: 'Gpg public key to verify origin releases against',
    },
    {
      key: 'ignore_missing_package_indices',
      label: 'Ignore Missing Package Indices',
      type: 'boolean',
      helperText: 'Allow syncing upstream repositories that declare architectures without package indices',
    },
  ],
  repositoryFields: [
    {
      key: 'autopublish',
      label: 'Auto-publish',
      type: 'boolean',
      helperText: 'Automatically create publications for new repository versions',
    },
    {
      key: 'signing_service',
      label: 'Signing Service',
      type: 'text',
      helperText: 'href of an associated signing service, used if the publication does not set one',
    },
    {
      key: 'publish_upstream_release_fields',
      label: 'Publish Upstream Release Fields',
      type: 'boolean',
      helperText: 'Publish the additional synced Release file fields (version, origin, label, description)',
    },
    {
      key: 'signing_service_release_overrides',
      label: 'Signing Service Release Overrides (JSON)',
      type: 'json',
      helperText: 'JSON object of Release distributions to the Signing Service URLs they should use',
    },
  ],
  distributionFields: [{ key: 'checkpoint', label: 'Checkpoint', type: 'boolean' }],
  publicationFields: [
    {
      key: 'simple',
      label: 'Simple',
      type: 'boolean',
      helperText: 'Activate simple publishing mode (all packages in one release component)',
    },
    {
      key: 'structured',
      label: 'Structured',
      type: 'boolean',
      defaultValue: true,
      helperText: 'Activate structured publishing mode',
    },
    { key: 'checkpoint', label: 'Checkpoint', type: 'boolean' },
    {
      key: 'signing_service',
      label: 'Signing Service',
      type: 'text',
      helperText: 'Sign Release files with this signing key',
    },
    {
      key: 'publish_upstream_release_fields',
      label: 'Publish Upstream Release Fields',
      type: 'boolean',
      helperText: 'Publish the additional synced Release file fields',
    },
  ],
  remoteColumns: [{ key: 'distributions', label: 'Distributions' }],
};

export const CONTAINER_PLUGIN: PluginConfig = {
  key: 'container',
  label: 'Container',
  routeBase: '/container',
  endpoints: {
    repositories: '/repositories/container/container/',
    remotes: '/remotes/container/container/',
    distributions: '/distributions/container/container/',
    // pulp_container does not use publications.
  },
  hasSync: true,
  remotePolicies: ['immediate', 'on_demand', 'streamed'],
  hasPullThrough: false,
  remoteFields: [
    {
      key: 'upstream_name',
      label: 'Upstream Name',
      type: 'text',
      required: true,
      helperText: 'Name of the upstream repository, e.g. "library/nginx"',
    },
    {
      key: 'include_tags',
      label: 'Include Tags',
      type: 'stringlist',
      helperText: 'Tags to include during the sync, one per line (wildcards allowed, e.g. v3.*)',
    },
    {
      key: 'exclude_tags',
      label: 'Exclude Tags',
      type: 'stringlist',
      helperText: 'Tags to exclude during the sync, one per line (wildcards allowed, e.g. *-alpha)',
    },
    {
      key: 'sigstore',
      label: 'Sigstore',
      type: 'text',
      helperText: 'A URL to a sigstore to download image signatures from',
    },
  ],
  repositoryFields: [
    {
      key: 'manifest_signing_service',
      label: 'Manifest Signing Service',
      type: 'text',
      helperText: 'href of an associated signing service',
    },
  ],
  distributionFields: [
    { key: 'description', label: 'Description', type: 'text' },
    {
      key: 'repository_version',
      label: 'Repository Version (href)',
      type: 'text',
      helperText: 'RepositoryVersion to be served; cleared if a repository is selected',
    },
    {
      key: 'private',
      label: 'Private',
      type: 'boolean',
      helperText: 'Restrict pull access to explicitly authorized users',
    },
  ],
  remoteColumns: [{ key: 'upstream_name', label: 'Upstream' }],
  distributionColumns: [
    { key: 'private', label: 'Private', boolean: true },
    { key: 'hidden', label: 'Hidden', boolean: true },
  ],
};

/**
 * Container pull-through caching, rendered with the generic components under the
 * dedicated Container section (not part of CONTENT_PLUGINS, so it gets no nav
 * section or routes of its own — App.tsx and NavigationDrawer.tsx wire it in).
 * A pull-through distribution proxies its remote and caches whatever clients
 * pull; the API only accepts the on_demand policy for pull-through remotes.
 */
export const CONTAINER_PULL_THROUGH_PLUGIN: PluginConfig = {
  key: 'container-pull-through',
  label: 'Container Pull-Through',
  routeBase: '/container/pull-through',
  endpoints: {
    repositories: '/repositories/container/container/',
    remotes: '/remotes/container/pull-through/',
    distributions: '/distributions/container/pull-through/',
  },
  hasSync: false,
  remotePolicies: ['on_demand'],
  hasPullThrough: true,
  remoteFields: [
    {
      key: 'includes',
      label: 'Includes',
      type: 'stringlist',
      helperText: 'Upstream repositories to include, one per line (wildcards allowed)',
    },
    {
      key: 'excludes',
      label: 'Excludes',
      type: 'stringlist',
      helperText: 'Upstream repositories to exclude, one per line (wildcards allowed)',
    },
  ],
};

/** Plugins with dedicated nav sections and bespoke content pages. */
export const DEDICATED_PLUGINS: readonly PluginConfig[] = [
  RPM_PLUGIN,
  FILE_PLUGIN,
  DEB_PLUGIN,
  CONTAINER_PLUGIN,
];

export interface PluginRoutePaths {
  root: string;
  distribution: string;
  distributionView: string;
  publication: string;
  publicationView: string;
  remote: string;
  remoteView: string;
  repository: string;
  repositoryView: string;
}

export const pluginRoutePaths = (plugin: PluginConfig): PluginRoutePaths => ({
  root: plugin.routeBase,
  distribution: `${plugin.routeBase}/distribution`,
  distributionView: `${plugin.routeBase}/distribution/view`,
  publication: `${plugin.routeBase}/publication`,
  publicationView: `${plugin.routeBase}/publication/view`,
  remote: `${plugin.routeBase}/remote`,
  remoteView: `${plugin.routeBase}/remote/view`,
  repository: `${plugin.routeBase}/repository`,
  repositoryView: `${plugin.routeBase}/repository/view`,
});

export const getPlugin = (key: string): PluginConfig => {
  const plugin = [...CONTENT_PLUGINS, ...DEDICATED_PLUGINS].find((p) => p.key === key);
  if (!plugin) throw new Error(`Unknown content plugin: ${key}`);
  return plugin;
};
