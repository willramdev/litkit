import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import { QueryController } from './query-controller';
import { attachQueryClientProvider } from './query-client-context';

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

describe('QueryController', () => {
  it('registers as a controller', () => {
    const client = new QueryClient();
    const host = createMockHost();
    const ctrl = new QueryController(host, { queryKey: ['test'], queryFn: () => 'data' }, { client });

    expect(host.addController).toHaveBeenCalledWith(ctrl);
    cleanup(host);
  });

  it('throws when no client is available', () => {
    const host = createMockHost();
    const ctrl = new QueryController(host, { queryKey: ['test'], queryFn: () => 'data' });

    expect(() => ctrl.result).toThrow(/No QueryClient/);
    cleanup(host);
  });

  it('provides result after connect with direct client', () => {
    const client = new QueryClient();
    const host = createMockHost();
    const ctrl = new QueryController(
      host,
      { queryKey: ['test'], queryFn: () => 'data', enabled: false },
      { client },
    );

    ctrl.hostConnected();

    const result = ctrl.result;
    expect(result).toBeDefined();
    expect(result.status).toBe('pending');

    ctrl.hostDisconnected();
    cleanup(host);
  });

  it('re-mounts the client on reconnect and balances mount/unmount', () => {
    const client = new QueryClient();
    const mountSpy = vi.spyOn(client, 'mount');
    const unmountSpy = vi.spyOn(client, 'unmount');
    const host = createMockHost();
    const ctrl = new QueryController(
      host,
      { queryKey: ['reconnect'], queryFn: () => 'data', enabled: false },
      { client },
    );

    ctrl.hostConnected();
    expect(mountSpy).toHaveBeenCalledTimes(1);

    ctrl.hostDisconnected();
    expect(unmountSpy).toHaveBeenCalledTimes(1);

    // Host moved in the DOM and reconnected — must mount again, not leave the
    // client unmounted while still in use.
    ctrl.hostConnected();
    expect(mountSpy).toHaveBeenCalledTimes(2);

    ctrl.hostDisconnected();
    expect(unmountSpy).toHaveBeenCalledTimes(2);

    cleanup(host);
  });

  it('does not mount the client before connect', () => {
    const client = new QueryClient();
    const mountSpy = vi.spyOn(client, 'mount');
    const host = createMockHost();
    const ctrl = new QueryController(
      host,
      { queryKey: ['no-mount'], queryFn: () => 'data', enabled: false },
      { client },
    );

    // Accessing result syncs the observer but must not mount an unconnected host.
    void ctrl.result;
    expect(mountSpy).not.toHaveBeenCalled();

    cleanup(host);
  });

  it('resolves client from DOM context', () => {
    const client = new QueryClient();
    const host = createMockHost();

    const detach = attachQueryClientProvider(document.body, () => client);

    const ctrl = new QueryController(
      host,
      { queryKey: ['context-test'], queryFn: () => 'data', enabled: false },
    );

    ctrl.hostConnected();
    expect(ctrl.client).toBe(client);

    ctrl.hostDisconnected();
    detach();
    cleanup(host);
  });

  it('supports function-based options', () => {
    const client = new QueryClient();
    const host = createMockHost();
    let key = 'initial';

    const ctrl = new QueryController(
      host,
      () => ({ queryKey: [key], queryFn: () => key, enabled: false }),
      { client },
    );

    ctrl.hostConnected();
    expect(ctrl.result).toBeDefined();

    key = 'updated';
    ctrl.hostUpdate();
    // The controller should use the new options on next sync

    ctrl.hostDisconnected();
    cleanup(host);
  });

  it('cleans up on disconnect', () => {
    const client = new QueryClient();
    const host = createMockHost();
    const ctrl = new QueryController(
      host,
      { queryKey: ['cleanup'], queryFn: () => 'data', enabled: false },
      { client },
    );

    ctrl.hostConnected();
    ctrl.hostDisconnected();

    // Should not throw on disconnect
    expect(true).toBe(true);
    cleanup(host);
  });

  it('can setOptions after construction', () => {
    const client = new QueryClient();
    const host = createMockHost();
    const ctrl = new QueryController(
      host,
      { queryKey: ['v1'], queryFn: () => 'v1', enabled: false },
      { client },
    );

    ctrl.hostConnected();

    ctrl.setOptions({ queryKey: ['v2'], queryFn: () => 'v2', enabled: false });
    // Should not throw
    expect(ctrl.result).toBeDefined();

    ctrl.hostDisconnected();
    cleanup(host);
  });

  it('cancel() cancels in-flight queries', async () => {
    const client = new QueryClient();
    const host = createMockHost();
    let aborted = false;

    const ctrl = new QueryController(
      host,
      {
        queryKey: ['cancel-test'],
        queryFn: ({ signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              aborted = true;
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      },
      { client },
    );

    ctrl.hostConnected();

    // Let the query start
    await new Promise((r) => setTimeout(r, 10));

    await ctrl.cancel();
    expect(aborted).toBe(true);

    ctrl.hostDisconnected();
    cleanup(host);
  });

  it('cancel() is a no-op when no queryKey', async () => {
    const client = new QueryClient();
    const host = createMockHost();
    const ctrl = new QueryController(
      host,
      { queryKey: undefined as any, queryFn: () => 'data', enabled: false },
      { client },
    );

    ctrl.hostConnected();
    // Should not throw
    await ctrl.cancel();

    ctrl.hostDisconnected();
    cleanup(host);
  });
});
