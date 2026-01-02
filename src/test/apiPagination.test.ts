import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE, withPaginationParams, withQueryParams } from '../services/api';

describe('api pagination helpers', () => {
  it('adds default limit/offset to a plain endpoint', () => {
    expect(withPaginationParams('/tasks/')).toBe(`/tasks/?limit=${DEFAULT_PAGE_SIZE}&offset=0`);
  });

  it('overrides offset and preserves existing query params', () => {
    expect(withPaginationParams('/tasks/?state=running', { offset: 25 })).toBe(
      `/tasks/?state=running&limit=${DEFAULT_PAGE_SIZE}&offset=25`
    );
  });

  it('adds ordering and preserves existing query params', () => {
    expect(withPaginationParams('/tasks/?state=running', { offset: 25, ordering: '-pulp_created' })).toBe(
      `/tasks/?state=running&limit=${DEFAULT_PAGE_SIZE}&offset=25&ordering=-pulp_created`
    );
  });

  it('withQueryParams merges and overwrites keys', () => {
    expect(withQueryParams('/foo/?a=1', { a: 2, b: 'x' })).toBe('/foo/?a=2&b=x');
  });

  it('supports absolute URLs', () => {
    expect(withPaginationParams('http://example.com/pulp/api/v3/tasks/', { offset: 50, limit: 25 })).toBe(
      'http://example.com/pulp/api/v3/tasks/?limit=25&offset=50'
    );
  });
});
