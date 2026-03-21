import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import {
  requestQueryClient,
  attachQueryClientProvider,
  LIT_QUERY_CLIENT_REQUEST,
} from './query-client-context';

describe('requestQueryClient', () => {
  it('returns undefined when no provider is attached', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const client = requestQueryClient(target);
    expect(client).toBeUndefined();

    target.remove();
  });

  it('resolves a client from an ancestor provider', () => {
    const queryClient = new QueryClient();
    const parent = document.createElement('div');
    const child = document.createElement('div');
    parent.appendChild(child);
    document.body.appendChild(parent);

    const detach = attachQueryClientProvider(parent, () => queryClient);

    const resolved = requestQueryClient(child);
    expect(resolved).toBe(queryClient);

    detach();
    parent.remove();
  });

  it('stops propagation after responding', () => {
    const client = new QueryClient();
    const grandparent = document.createElement('div');
    const parent = document.createElement('div');
    const child = document.createElement('div');
    grandparent.appendChild(parent);
    parent.appendChild(child);
    document.body.appendChild(grandparent);

    const outerSpy = vi.fn();
    grandparent.addEventListener(LIT_QUERY_CLIENT_REQUEST, outerSpy);
    const detach = attachQueryClientProvider(parent, () => client);

    requestQueryClient(child);

    expect(outerSpy).not.toHaveBeenCalled();

    detach();
    grandparent.remove();
  });
});

describe('attachQueryClientProvider', () => {
  it('returns a detach function that removes the listener', () => {
    const client = new QueryClient();
    const el = document.createElement('div');
    document.body.appendChild(el);

    const detach = attachQueryClientProvider(el, () => client);
    expect(requestQueryClient(el)).toBe(client);

    detach();
    expect(requestQueryClient(el)).toBeUndefined();

    el.remove();
  });
});
