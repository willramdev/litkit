import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockRouter, mockMatch } from '@willramdev/router';
import { attachRouterLog } from './router-log.ts';

// esm-env resolves DEV to true under the default vitest/dev environment, so the
// attach fn takes its active (non-no-op) path here without any override.

describe('attachRouterLog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs a [litkit]-prefixed groupCollapsed header on navigation', () => {
    const router = createMockRouter();
    const group = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const teardown = attachRouterLog(router);
    router.setCurrentMatch(mockMatch({ name: 'home', pathname: '/' }));

    expect(group).toHaveBeenCalledTimes(1);
    expect(group.mock.calls[0][0]).toContain('[litkit]');
    expect(group.mock.calls[0][0]).toContain('home');

    teardown();
  });

  it('renders (initial) as the from-label on the first navigation (previous null)', () => {
    const router = createMockRouter();
    vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const teardown = attachRouterLog(router);
    router.setCurrentMatch(mockMatch({ name: 'dashboard', pathname: '/dashboard' }));

    // First console.log is the `from → to:` line: ['from → to:', from, '→', to]
    const fromToCall = log.mock.calls.find((c) => c[0] === 'from → to:');
    expect(fromToCall).toBeDefined();
    expect(fromToCall?.[1]).toBe('(initial)');
    expect(fromToCall?.[3]).toBe('dashboard');

    teardown();
  });

  it('teardown unsubscribes so later navigations log nothing', () => {
    const router = createMockRouter();
    const group = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const teardown = attachRouterLog(router);
    teardown();

    router.setCurrentMatch(mockMatch({ name: 'after', pathname: '/after' }));
    expect(group).not.toHaveBeenCalled();
  });

  it('calling the teardown a second time does not throw (idempotent)', () => {
    const router = createMockRouter();
    const teardown = attachRouterLog(router);
    teardown();
    expect(() => teardown()).not.toThrow();
  });
});
