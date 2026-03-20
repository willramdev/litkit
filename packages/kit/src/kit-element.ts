import { LitElement, type PropertyValues } from 'lit';
import type { ReactiveController } from 'lit';
import { normalizeProp } from './prop.ts';
import { WATCHERS, type WatchEntry } from './watch.ts';
import type { ControllerFactory } from './types.ts';

export class KitElement extends LitElement {
  /**
   * Register reactive properties using Lit-compatible declarations.
   * Accepts shorthand types (String, Number, etc.) or full PropertyDeclaration objects.
   *
   * Usage in a static block:
   *   static { this.props({ title: String, open: prop.boolean({ reflect: true }) }); }
   *
   * Usage after class definition:
   *   MyElement.props({ title: String });
   */
  static props(defs: Record<string, unknown>): void {
    for (const [name, def] of Object.entries(defs)) {
      this.createProperty(name, normalizeProp(def));
    }
  }

  // ── Controller ergonomics ────────────────────────────────────────────

  use<T extends ReactiveController>(controllerOrFactory: T | ControllerFactory<T>): T {
    if (typeof controllerOrFactory === 'function') {
      return (controllerOrFactory as ControllerFactory<T>)(this);
    }
    return controllerOrFactory;
  }

  // ── Event ergonomics ─────────────────────────────────────────────────

  emit(name: string, detail?: unknown, options?: Partial<CustomEventInit>): boolean {
    return this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true,
        detail,
        ...options,
      })
    );
  }

  // ── Shadow DOM query helpers ─────────────────────────────────────────

  $<T extends Element = Element>(selector: string): T | null {
    return this.renderRoot?.querySelector<T>(selector) ?? null;
  }

  $$<T extends Element = Element>(selector: string): T[] {
    return [...(this.renderRoot?.querySelectorAll<T>(selector) ?? [])];
  }

  // ── Update helpers ───────────────────────────────────────────────────

  invalidate(): void {
    this.requestUpdate();
  }

  afterRender(callback: () => void): void {
    this.updateComplete.then(callback);
  }

  // ── @watch integration ───────────────────────────────────────────────

  override updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    this._processWatchers(changedProps);
  }

  private _processWatchers(changedProps: PropertyValues): void {
    let proto: object | null = Object.getPrototypeOf(this);
    while (proto) {
      if (Object.prototype.hasOwnProperty.call(proto, WATCHERS)) {
        const watchers = (proto as Record<symbol, WatchEntry[]>)[WATCHERS];
        for (const w of watchers) {
          for (const p of w.props) {
            if (changedProps.has(p)) {
              const self = this as unknown as Record<string, unknown>;
              (self[w.method] as Function).call(
                this,
                self[p],
                changedProps.get(p)
              );
              break; // call handler once per update even if multiple watched props changed
            }
          }
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
  }
}
