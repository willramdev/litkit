import { describe, it, expect, vi } from 'vitest';
import { RouteController } from '../router-lit/route-controller.ts';
import { routeState } from '../router-lit/index.ts';
import { createMockRouter, mockMatch } from '../router-core/testing.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('RouteController', () => {
  it('registers itself with the host', () => {
    const host = createMockHost();
    const router = createMockRouter();
    new RouteController(host as any, router);
    expect(host.addController).toHaveBeenCalledOnce();
  });

  it('returns null match before connection', () => {
    const host = createMockHost();
    const router = createMockRouter({
      current: mockMatch({ pathname: '/users' }),
    });
    const ctrl = new RouteController(host as any, router);
    expect(ctrl.match).toBeNull();
  });

  it('picks up current match on hostConnected', () => {
    const host = createMockHost();
    const match = mockMatch({ pathname: '/users', params: { id: '1' } });
    const router = createMockRouter({ current: match });
    const ctrl = new RouteController(host as any, router);

    ctrl.hostConnected();
    expect(ctrl.match).toBe(match);
    expect(ctrl.params).toEqual({ id: '1' });
  });

  it('updates on route change and requests host update', () => {
    const host = createMockHost();
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    const ctrl = new RouteController(host as any, router);
    ctrl.hostConnected();

    const newMatch = mockMatch({ pathname: '/about', name: 'about' });
    router.setCurrentMatch(newMatch);

    expect(ctrl.match).toBe(newMatch);
    expect(host.requestUpdate).toHaveBeenCalled();
  });

  it('unsubscribes on hostDisconnected', () => {
    const host = createMockHost();
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    const ctrl = new RouteController(host as any, router);
    ctrl.hostConnected();

    ctrl.hostDisconnected();
    host.requestUpdate.mockClear();

    router.setCurrentMatch(mockMatch({ pathname: '/new' }));
    expect(host.requestUpdate).not.toHaveBeenCalled();
  });

  it('exposes query, meta, and params helpers', () => {
    const host = createMockHost();
    const match = mockMatch({
      pathname: '/test',
      params: { id: '42' },
      query: { tab: 'posts' },
      meta: { auth: true },
    });
    const router = createMockRouter({ current: match });
    const ctrl = new RouteController(host as any, router);
    ctrl.hostConnected();

    expect(ctrl.params).toEqual({ id: '42' });
    expect(ctrl.query).toEqual({ tab: 'posts' });
    expect(ctrl.meta).toEqual({ auth: true });
  });

  it('returns empty objects when no match', () => {
    const host = createMockHost();
    const router = createMockRouter();
    const ctrl = new RouteController(host as any, router);

    expect(ctrl.params).toEqual({});
    expect(ctrl.query).toEqual({});
    expect(ctrl.meta).toEqual({});
  });
});

describe('routeState factory', () => {
  it('returns a factory function that creates a RouteController', () => {
    const host = createMockHost();
    const router = createMockRouter({
      current: mockMatch({ pathname: '/home' }),
    });
    const factory = routeState(router);
    const ctrl = factory(host as any);

    expect(ctrl).toBeInstanceOf(RouteController);
    expect(host.addController).toHaveBeenCalledOnce();
  });
});
