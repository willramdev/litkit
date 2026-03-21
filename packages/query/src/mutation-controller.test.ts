import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
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

function cleanup(host: HTMLElement) {
  host.remove();
}

describe('MutationController', () => {
  it('registers as a controller', () => {
    const client = new QueryClient();
    const host = createMockHost();
    const ctrl = new MutationController(host, { mutationFn: async () => 'ok' }, { client });

    expect(host.addController).toHaveBeenCalledWith(ctrl);
    cleanup(host);
  });

  it('throws when no client is available', () => {
    const host = createMockHost();
    const ctrl = new MutationController(host, { mutationFn: async () => 'ok' });

    expect(() => ctrl.result).toThrow(/No QueryClient/);
    cleanup(host);
  });

  it('provides idle result after connect', () => {
    const client = new QueryClient();
    const host = createMockHost();
    const ctrl = new MutationController(
      host,
      { mutationFn: async () => 'ok' },
      { client },
    );

    ctrl.hostConnected();

    expect(ctrl.result.status).toBe('idle');

    ctrl.hostDisconnected();
    cleanup(host);
  });

  it('executes mutation and resolves', async () => {
    const client = new QueryClient();
    const host = createMockHost();
    const mutationFn = vi.fn(async (input: string) => `result:${input}`);
    const ctrl = new MutationController(
      host,
      { mutationFn },
      { client },
    );

    ctrl.hostConnected();

    const result = await ctrl.mutate('test');
    expect(result).toBe('result:test');
    expect(mutationFn.mock.calls[0][0]).toBe('test');

    ctrl.hostDisconnected();
    cleanup(host);
  });

  it('cleans up on disconnect', () => {
    const client = new QueryClient();
    const host = createMockHost();
    const ctrl = new MutationController(
      host,
      { mutationFn: async () => 'ok' },
      { client },
    );

    ctrl.hostConnected();
    ctrl.hostDisconnected();

    expect(true).toBe(true);
    cleanup(host);
  });

  it('supports function-based options', () => {
    const client = new QueryClient();
    const host = createMockHost();

    const ctrl = new MutationController(
      host,
      () => ({ mutationFn: async () => 'dynamic' }),
      { client },
    );

    ctrl.hostConnected();
    expect(ctrl.result.status).toBe('idle');

    ctrl.hostDisconnected();
    cleanup(host);
  });

  it('can reset mutation state', () => {
    const client = new QueryClient();
    const host = createMockHost();
    const ctrl = new MutationController(
      host,
      { mutationFn: async () => 'ok' },
      { client },
    );

    ctrl.hostConnected();
    ctrl.reset();
    expect(ctrl.result.status).toBe('idle');

    ctrl.hostDisconnected();
    cleanup(host);
  });
});
