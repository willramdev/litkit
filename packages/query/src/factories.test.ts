import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import { query, mutation, createQueryClient, queryOptions, mutationOptions } from './index';
import { QueryController } from './query-controller';
import { MutationController } from './mutation-controller';

function createMockHost() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return Object.assign(el, {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });
}

describe('query factory', () => {
  it('returns a factory function that creates a QueryController', () => {
    const client = new QueryClient();
    const factory = query(
      { queryKey: ['test'], queryFn: () => 'data', enabled: false },
      { client },
    );

    expect(typeof factory).toBe('function');

    const host = createMockHost();
    const ctrl = factory(host);
    expect(ctrl).toBeInstanceOf(QueryController);
    host.remove();
  });
});

describe('mutation factory', () => {
  it('returns a factory function that creates a MutationController', () => {
    const client = new QueryClient();
    const factory = mutation(
      { mutationFn: async () => 'ok' },
      { client },
    );

    expect(typeof factory).toBe('function');

    const host = createMockHost();
    const ctrl = factory(host);
    expect(ctrl).toBeInstanceOf(MutationController);
    host.remove();
  });
});

describe('createQueryClient', () => {
  it('creates a QueryClient', () => {
    const client = createQueryClient();
    expect(client).toBeInstanceOf(QueryClient);
  });
});

describe('queryOptions', () => {
  it('passes through options unchanged', () => {
    const opts = { queryKey: ['test'] as const, queryFn: () => 'data' };
    expect(queryOptions(opts)).toBe(opts);
  });
});

describe('mutationOptions', () => {
  it('passes through options unchanged', () => {
    const opts = { mutationFn: async () => 'data' };
    expect(mutationOptions(opts)).toBe(opts);
  });
});
