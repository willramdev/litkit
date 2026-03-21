import type { ReactiveController, ReactiveElement } from 'lit';

/** Factory function that creates a controller when given a host. Compatible with `KitElement.use()`. */
export type ControllerFactory<T extends ReactiveController> = (
  host: ReactiveElement
) => T;
