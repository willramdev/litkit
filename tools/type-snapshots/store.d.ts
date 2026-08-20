import { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Batch multiple store updates into a single flush cycle.
 * Subscribers are notified once when the batch completes.
 */
export declare function batch(fn: () => void): void;
export type Listener<T> = (state: T, prev: T) => void;
/** Minimal read-only store interface — shared by `Store` and `DerivedStore`. */
export interface ReadableStore<T> {
	/** Returns the current state. */
	get(): T;
	/** Subscribe to state changes. Returns an unsubscribe function. */
	subscribe(listener: Listener<T>): () => void;
}
/** Reactive store with get/set/update/subscribe API. */
export interface Store<T> extends ReadableStore<T> {
	/** Replaces the state and notifies all subscribers. */
	set(state: T): void;
	/** Updates the state using a function and notifies all subscribers. */
	update(fn: (state: T) => T): void;
}
/** Creates a reactive store with the given initial state. */
export declare function createStore<T>(initialState: T): Store<T>;
/** Options for `storeSlice`. */
export interface StoreSliceOptions<S> {
	/** Custom equality function. Defaults to strict equality (`===`). */
	equal?: (a: S, b: S) => boolean;
}
/**
 * Reactive controller that subscribes to a slice of a store.
 * Only triggers `requestUpdate()` when the selected value changes.
 *
 * Accepts any `ReadableStore` — works with both `Store` and `DerivedStore`.
 */
export declare class StoreSliceController<T, S> implements ReactiveController {
	host: ReactiveControllerHost;
	private _store;
	private _selector;
	private _equal;
	private _unsubscribe;
	private _value;
	constructor(host: ReactiveControllerHost, store: ReadableStore<T>, selector: (state: T) => S, options?: StoreSliceOptions<S>);
	get value(): S;
	hostConnected(): void;
	hostDisconnected(): void;
}
/** Creates a reactive controller that subscribes to a slice of a store or derived store. */
export declare function storeSlice<T, S>(host: ReactiveControllerHost, store: ReadableStore<T>, selector: (state: T) => S, options?: StoreSliceOptions<S>): StoreSliceController<T, S>;
/** A read-only store whose value is derived from one or more source stores. */
export interface DerivedStore<T> extends ReadableStore<T> {
}
/** Options for `derived()`. */
export interface DerivedOptions<T> {
	/** Custom equality function. Defaults to `Object.is`. */
	equal?: (a: T, b: T) => boolean;
}
/**
 * Create a read-only store derived from a single source store.
 *
 * ```ts
 * const count = createStore(0);
 * const doubled = derived(count, (c) => c * 2);
 * doubled.get(); // 0
 * count.set(3);
 * doubled.get(); // 6
 * ```
 */
export declare function derived<S, T>(store: ReadableStore<S>, fn: (value: S) => T, options?: DerivedOptions<T>): DerivedStore<T>;
/**
 * Create a read-only store derived from multiple source stores.
 *
 * ```ts
 * const a = createStore(1);
 * const b = createStore(2);
 * const sum = derived([a, b], ([aVal, bVal]) => aVal + bVal);
 * sum.get(); // 3
 * ```
 */
export declare function derived<S extends readonly ReadableStore<any>[], T>(stores: [
	...S
], fn: (values: {
	[K in keyof S]: S[K] extends ReadableStore<infer V> ? V : never;
}) => T, options?: DerivedOptions<T>): DerivedStore<T>;

export {};
