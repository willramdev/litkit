// BUILD-06 smoke consumer for @willramdev/router.
//
// This file is type-checked (never executed) by tsc under BOTH `node16` and
// `bundler` module resolution to prove that every published subpath of
// @willramdev/router resolves to a real `.d.ts` via its package `exports` map.
// It imports representative real symbols from all three subpaths so that an
// unresolved subpath becomes a hard TS2307 error instead of a silent `any`.
//
// Do NOT add `allowImportingTsExtensions` to the smoke tsconfigs: that would let
// tsc fall back to resolving the workspace `src/*.ts` and defeat the exports-map
// resolution this harness exists to verify.

// `.` — a value binding + a type binding.
import { createRouter, type Router } from "@willramdev/router";
// `./lit` — a Lit-only element class.
import { RouterOutlet } from "@willramdev/router/lit";
// `./core` — a framework-neutral, core-only symbol.
import { CompiledPathMatcher } from "@willramdev/router/core";

// Reference every imported value binding so `noUnusedLocals` cannot strip the
// import; a stripped import would hide an unresolved subpath.
void createRouter;
void RouterOutlet;
void CompiledPathMatcher;

// Reference the type-only import so it, too, participates in resolution.
export type SmokeRouter = Router;
