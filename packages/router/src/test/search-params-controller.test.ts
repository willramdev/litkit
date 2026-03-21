import { describe, it, expect, vi } from 'vitest';
import { SearchParamsController } from '../router-lit/search-params-controller.ts';
import { searchParams } from '../router-lit/index.ts';
import { createMockRouter, mockMatch } from '../router-core/testing.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('SearchParamsController', () => {
  it('registers itself with the host', () => {
    const host = createMockHost();
    const router = createMockRouter();
    new SearchParamsController(host as any, router);
    expect(host.addController).toHaveBeenCalledOnce();
  });

  it('returns empty params before connection', () => {
    const host = createMockHost();
    const router = createMockRouter();
    const ctrl = new SearchParamsController(host as any, router);
    expect(ctrl.params.toString()).toBe('');
    expect(ctrl.get('foo')).toBeNull();
    expect(ctrl.has('foo')).toBe(false);
  });

  it('reads params from current match on hostConnected', () => {
    const host = createMockHost();
    const match = mockMatch({
      pathname: '/test',
      searchParams: new URLSearchParams('foo=bar&baz=qux'),
    });
    const router = createMockRouter({ current: match });
    const ctrl = new SearchParamsController(host as any, router);

    ctrl.hostConnected();
    expect(ctrl.get('foo')).toBe('bar');
    expect(ctrl.get('baz')).toBe('qux');
    expect(ctrl.has('foo')).toBe(true);
    expect(ctrl.has('missing')).toBe(false);
  });

  it('getAll returns multiple values for repeated keys', () => {
    const host = createMockHost();
    const match = mockMatch({
      pathname: '/test',
      searchParams: new URLSearchParams('tag=a&tag=b&tag=c'),
    });
    const router = createMockRouter({ current: match });
    const ctrl = new SearchParamsController(host as any, router);

    ctrl.hostConnected();
    expect(ctrl.getAll('tag')).toEqual(['a', 'b', 'c']);
  });

  it('updates reactively when route changes', () => {
    const host = createMockHost();
    const router = createMockRouter({
      current: mockMatch({ pathname: '/', searchParams: new URLSearchParams('') }),
    });
    const ctrl = new SearchParamsController(host as any, router);
    ctrl.hostConnected();

    const newMatch = mockMatch({
      pathname: '/',
      searchParams: new URLSearchParams('page=2'),
    });
    router.setCurrentMatch(newMatch);

    expect(ctrl.get('page')).toBe('2');
    expect(host.requestUpdate).toHaveBeenCalled();
  });

  it('set() calls router.replace with updated params', () => {
    const host = createMockHost();
    const match = mockMatch({
      pathname: '/test',
      searchParams: new URLSearchParams('foo=bar'),
    });
    const router = createMockRouter({ current: match });
    const ctrl = new SearchParamsController(host as any, router);
    ctrl.hostConnected();

    ctrl.set('page', '3');

    expect(router.navigationHistory).toHaveLength(1);
    const nav = router.navigationHistory[0];
    expect(nav.replace).toBe(true);
    const input = nav.input as { to: string; query: Record<string, string> };
    expect(input.to).toBe('/test');
    expect(input.query).toEqual({ foo: 'bar', page: '3' });
  });

  it('delete() removes a param and calls router.replace', () => {
    const host = createMockHost();
    const match = mockMatch({
      pathname: '/test',
      searchParams: new URLSearchParams('foo=bar&page=1'),
    });
    const router = createMockRouter({ current: match });
    const ctrl = new SearchParamsController(host as any, router);
    ctrl.hostConnected();

    ctrl.delete('page');

    expect(router.navigationHistory).toHaveLength(1);
    const input = router.navigationHistory[0].input as { query: Record<string, string> };
    expect(input.query).toEqual({ foo: 'bar' });
  });

  it('setAll() replaces all params', () => {
    const host = createMockHost();
    const match = mockMatch({
      pathname: '/test',
      searchParams: new URLSearchParams('old=value'),
    });
    const router = createMockRouter({ current: match });
    const ctrl = new SearchParamsController(host as any, router);
    ctrl.hostConnected();

    ctrl.setAll({ brand: 'new', key: 'val' });

    const input = router.navigationHistory[0].input as { query: Record<string, string> };
    expect(input.query).toEqual({ brand: 'new', key: 'val' });
  });

  it('unsubscribes on hostDisconnected', () => {
    const host = createMockHost();
    const router = createMockRouter({
      current: mockMatch({ pathname: '/' }),
    });
    const ctrl = new SearchParamsController(host as any, router);
    ctrl.hostConnected();
    ctrl.hostDisconnected();

    host.requestUpdate.mockClear();
    router.setCurrentMatch(mockMatch({ pathname: '/new' }));
    expect(host.requestUpdate).not.toHaveBeenCalled();
  });

  it('preserves hash when setting params', () => {
    const host = createMockHost();
    const match = mockMatch({
      pathname: '/test',
      hash: '#section',
      searchParams: new URLSearchParams(''),
    });
    const router = createMockRouter({ current: match });
    const ctrl = new SearchParamsController(host as any, router);
    ctrl.hostConnected();

    ctrl.set('q', 'hello');

    const input = router.navigationHistory[0].input as { hash: string };
    expect(input.hash).toBe('#section');
  });
});

describe('searchParams factory', () => {
  it('returns a factory function that creates a SearchParamsController', () => {
    const host = createMockHost();
    const router = createMockRouter();
    const factory = searchParams(router);
    const ctrl = factory(host as any);

    expect(ctrl).toBeInstanceOf(SearchParamsController);
    expect(host.addController).toHaveBeenCalledOnce();
  });
});
