import type { ReactiveController, ReactiveElement } from 'lit';

export type ControllerFactory<T extends ReactiveController> = (
  host: ReactiveElement
) => T;
