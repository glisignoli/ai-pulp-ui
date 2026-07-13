export type RemotePolicy = 'immediate' | 'on_demand' | 'streamed';

export interface PluginEndpoints {
  repositories: string;
  remotes: string;
  distributions: string;
  /** Only present for plugins that use publications (Gem, Python, Hugging Face). */
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
}

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
  },
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
  const plugin = CONTENT_PLUGINS.find((p) => p.key === key);
  if (!plugin) throw new Error(`Unknown content plugin: ${key}`);
  return plugin;
};
