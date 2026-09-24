// BUILD-06 smoke consumer for the remaining seven @willramdev subpaths:
//   @willramdev/kit `.`, @willramdev/kit/context, @willramdev/http `.`,
//   @willramdev/store `.`, @willramdev/query `.`, @willramdev/forms `.`, and
//   @willramdev/forms/zod.
//
// Type-checked (never executed) by tsc under BOTH `node16` and `bundler`
// module resolution to prove that every one of these published subpaths
// resolves to a real `.d.ts` via its package `exports` map. Each import pulls
// a representative real symbol (a value binding and, where available, a type
// binding) so that an unresolved subpath becomes a hard TS2307 error instead
// of silently degrading to `any`.
//
// Do NOT add `allowImportingTsExtensions` to the smoke tsconfigs: that would let
// tsc fall back to resolving the workspace `src/*.ts` and defeat the exports-map
// resolution this harness exists to verify.

// @willramdev/kit `.` — a base-class value + a type binding.
import { KitElement, type ControllerFactory } from "@willramdev/kit";
// @willramdev/http `.` — the HTTP client factory + a type.
import { createHttpClient, type HttpResponse } from "@willramdev/http";
// @willramdev/kit/context — the framework-neutral context factory + a type.
import { createContext, type Context } from "@willramdev/kit/context";
// @willramdev/store `.` — a factory value + the store type.
import { createStore, type Store } from "@willramdev/store";
// @willramdev/query `.` — a client factory value + a controller-config type.
import { createQueryClient, type QueryControllerConfig } from "@willramdev/query";
// @willramdev/forms `.` — the form controller factory value + a form type.
import { form, type FormInstance } from "@willramdev/forms";
// @willramdev/forms/zod — the zod adapter value (no type export on this subpath).
import { zodValidator } from "@willramdev/forms/zod";

// Reference every imported value binding so `noUnusedLocals` cannot strip the
// import; a stripped import would hide an unresolved subpath.
void KitElement;
void createHttpClient;
void createContext;
void createStore;
void createQueryClient;
void form;
void zodValidator;

// Reference each type-only import so it, too, participates in resolution.
export type SmokeControllerFactory = ControllerFactory<never>;
export type SmokeHttpResponse = HttpResponse<unknown>;
export type SmokeContext = Context<unknown>;
export type SmokeStore = Store<unknown>;
export type SmokeQueryControllerConfig = QueryControllerConfig;
export type SmokeFormInstance = FormInstance<Record<string, unknown>>;
