import { describe, expect, it } from 'vitest';
import {
  CONTAINER_PULL_THROUGH_PLUGIN,
  CONTENT_PLUGINS,
  getPlugin,
  pluginRoutePaths,
} from '../constants/plugins';
import { ROUTES } from '../constants/routes';

describe('CONTENT_PLUGINS', () => {
  it('contains the expected plugins', () => {
    expect(CONTENT_PLUGINS.map((p) => p.key).sort()).toEqual([
      'ansible',
      'gem',
      'hugging_face',
      'maven',
      'npm',
      'ostree',
      'python',
      'rust',
    ]);
  });

  it('has unique keys, labels, and route bases', () => {
    const keys = CONTENT_PLUGINS.map((p) => p.key);
    const labels = CONTENT_PLUGINS.map((p) => p.label);
    const routeBases = CONTENT_PLUGINS.map((p) => p.routeBase);
    expect(new Set(keys).size).toBe(CONTENT_PLUGINS.length);
    expect(new Set(labels).size).toBe(CONTENT_PLUGINS.length);
    expect(new Set(routeBases).size).toBe(CONTENT_PLUGINS.length);
  });

  it('uses well-formed API endpoints', () => {
    for (const plugin of CONTENT_PLUGINS) {
      for (const endpoint of Object.values(plugin.endpoints)) {
        expect(endpoint, `${plugin.key} endpoint ${endpoint}`).toMatch(/^\/(repositories|remotes|distributions|publications)\/.+\/$/);
      }
    }
  });

  it('only publication-based plugins define a publications endpoint', () => {
    const withPublications = CONTENT_PLUGINS.filter((p) => p.endpoints.publications).map((p) => p.key);
    expect(withPublications.sort()).toEqual(['gem', 'hugging_face', 'python']);
  });

  it('maven is the only plugin without sync', () => {
    const withoutSync = CONTENT_PLUGINS.filter((p) => !p.hasSync).map((p) => p.key);
    expect(withoutSync).toEqual(['maven']);
  });

  it('every plugin declares at least one remote policy', () => {
    for (const plugin of CONTENT_PLUGINS) {
      expect(plugin.remotePolicies.length, plugin.key).toBeGreaterThan(0);
    }
  });

  it('declares pull-through caching only for plugins whose distributions accept a remote', () => {
    const withPullThrough = CONTENT_PLUGINS.filter((p) => p.hasPullThrough).map((p) => p.key);
    expect(withPullThrough.sort()).toEqual(['gem', 'hugging_face', 'maven', 'npm', 'python', 'rust']);
  });

  it('python uses the pypi distribution and publication endpoints', () => {
    const python = getPlugin('python');
    expect(python.endpoints.distributions).toBe('/distributions/python/pypi/');
    expect(python.endpoints.publications).toBe('/publications/python/pypi/');
  });

  it('ansible manages collection remotes', () => {
    expect(getPlugin('ansible').endpoints.remotes).toBe('/remotes/ansible/collection/');
  });

  it('hugging face endpoints use the hyphenated plugin path', () => {
    const huggingFace = getPlugin('hugging_face');
    expect(huggingFace.endpoints.repositories).toBe('/repositories/hugging_face/hugging-face/');
    expect(huggingFace.endpoints.publications).toBe('/publications/hugging_face/hugging-face/');
  });
});

describe('pluginRoutePaths', () => {
  it('derives all routes from the route base', () => {
    const paths = pluginRoutePaths(getPlugin('gem'));
    expect(paths).toEqual({
      root: '/gem',
      distribution: '/gem/distribution',
      distributionView: '/gem/distribution/view',
      publication: '/gem/publication',
      publicationView: '/gem/publication/view',
      remote: '/gem/remote',
      remoteView: '/gem/remote/view',
      repository: '/gem/repository',
      repositoryView: '/gem/repository/view',
    });
  });
});

describe('CONTAINER_PULL_THROUGH_PLUGIN', () => {
  it('is not part of CONTENT_PLUGINS', () => {
    expect(CONTENT_PLUGINS).not.toContain(CONTAINER_PULL_THROUGH_PLUGIN);
  });

  it('uses the container pull-through endpoints without publications or sync', () => {
    expect(CONTAINER_PULL_THROUGH_PLUGIN.endpoints).toEqual({
      repositories: '/repositories/container/container/',
      remotes: '/remotes/container/pull-through/',
      distributions: '/distributions/container/pull-through/',
    });
    expect(CONTAINER_PULL_THROUGH_PLUGIN.hasSync).toBe(false);
    expect(CONTAINER_PULL_THROUGH_PLUGIN.hasPullThrough).toBe(true);
  });

  it('only allows the on_demand policy', () => {
    expect(CONTAINER_PULL_THROUGH_PLUGIN.remotePolicies).toEqual(['on_demand']);
  });

  it('derives route paths matching the ROUTES constants', () => {
    const paths = pluginRoutePaths(CONTAINER_PULL_THROUGH_PLUGIN);
    expect(paths.distribution).toBe(ROUTES.CONTAINER.PULL_THROUGH_DISTRIBUTION);
    expect(paths.distributionView).toBe(ROUTES.CONTAINER.PULL_THROUGH_DISTRIBUTION_VIEW);
    expect(paths.remote).toBe(ROUTES.CONTAINER.PULL_THROUGH_REMOTE);
    expect(paths.remoteView).toBe(ROUTES.CONTAINER.PULL_THROUGH_REMOTE_VIEW);
  });
});

describe('getPlugin', () => {
  it('throws for unknown plugins', () => {
    expect(() => getPlugin('nope')).toThrow('Unknown content plugin: nope');
  });
});
