// Core
export { KitElement } from './kit-element.ts';
export { prop, normalizeProp } from './prop.ts';
export { define } from './define.ts';
export { emit } from './emit.ts';

// Derived state
export { computed } from './computed.ts';
export type { ComputedController } from './computed.ts';

// Decorators
export { watch } from './watch.ts';
export { bind } from './bind.ts';
export { debounce } from './debounce.ts';
export { throttle } from './throttle.ts';

// State
export { queryState } from './query-state.ts';
export { persistedState } from './persisted-state.ts';
export type { QueryStateController } from './query-state.ts';
export type { PersistedStateController } from './persisted-state.ts';

// Controllers
export {
  listen,
  mediaQuery,
  resizeObserver,
  intersectionObserver,
  clickOutside,
} from './controllers/index.ts';
export type {
  ListenController,
  MediaQueryController,
  ResizeObserverController,
  IntersectionObserverController,
  ClickOutsideController,
} from './controllers/index.ts';

// Types
export type { ControllerFactory } from './types.ts';
