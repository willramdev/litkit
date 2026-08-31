---
phase: 11
slug: devtools-debugging
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-23
---

# Phase 11 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| consumer bundler → shipped devtools dist | devtools code must be DEV-gated + tree-shakeable so it never survives into a production consumer bundle | source modules (no runtime data); risk is code presence |
| Redux DevTools browser extension → attachStoreDevtools | extension DISPATCH messages (incl. `msg.state` as a JSON string) consumed at runtime; extension is a trusted, user-installed dev tool present only in DEV | untrusted-ish JSON string (`msg.state`) |
| @tanstack/query-devtools panel → document.body | third-party panel mounted into a devtools-owned host node; devtools owns its lifecycle (mount/unmount + node removal) | DOM node ownership |
| npm registry → workspace install | `@tanstack/query-devtools` / `@tanstack/query-core` installed as devDeps | third-party package code (supply chain) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-11-01 | Information Disclosure | devtools code leaking into a prod consumer bundle | medium | mitigate | LOCAL esm-env `DEV` gate + `sideEffects:false` (package.json) + per-module split + leaf-rule CI gate (`scripts/check-devtools-leaf.mjs`); opt-in explicit import only | closed |
| T-11-01b | Information Disclosure | store-devtools code leaking into a prod bundle | medium | mitigate | DEV+window gate `store-devtools.ts:69` + `sideEffects:false`; opt-in import only | closed |
| T-11-01c | Information Disclosure | query-devtools code (+ heavy panel) leaking into a prod bundle | medium | mitigate | DEV+document gate `query-devtools.ts:20` + `await import(...)` (separate async chunk) + optional peer + leaf-rule gate | closed |
| T-11-02 | Tampering / DoS | malformed `msg.state` from the extension throwing or corrupting store state | low | mitigate | `JSON.parse` wrapped in try/catch `store-devtools.ts:94-98`; restore only on DISPATCH+JUMP/ROLLBACK/RESET/COMMIT; `isTimeTravel` flag prevents record↔restore feedback loop | closed |
| T-11-03 | Denial of Service | SSR / no-`console` reference in attachRouterLog | low | mitigate | Guard `if (!DEV \|\| typeof console === 'undefined') return () => {}` `router-log.ts:21` — silent no-op | closed |
| T-11-04 | Denial of Service | SSR / no-`window` reference in store devtools | low | mitigate | Guard order DEV → `typeof window` → ext presence `store-devtools.ts:69-71`, each a silent no-op teardown | closed |
| T-11-05 | Denial of Service | SSR / no-`document` reference, or a leaked host node after teardown | low | mitigate | Guard `!DEV \|\| typeof document === 'undefined' \|\| !document.body` `query-devtools.ts:20`; `disposed` flag prevents late mount; teardown `unmount()` + `host.remove()` `query-devtools.ts:56-57`; `host.remove()` on mount failure `:50` | closed |
| T-11-SC | Tampering | `@tanstack/query-devtools` / `@tanstack/query-core` supply chain | medium | mitigate | Pinned `^5.91.0` (aligned to installed query-core); RESEARCH §Package Legitimacy Audit verified — SUS(too-new) documented false-positive on latest patch only; ~9.99M dl/wk, official TanStack monorepo, `deprecated:false`, `postinstall:null`, exact package the official React adapter pins | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `high` count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|

No accepted risks. All threats closed by implemented mitigations.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-23 | 8 | 8 | 0 | gsd-secure-phase (L1 grep verification, register authored at plan time) |

Verification method: register built from the `<threat_model>` blocks in `11-01/02/03-PLAN.md` (all authored at plan time). No threat rated `high`; ASVS L1 grep-depth mitigation verification confirmed each control in the implementation:
- DEV gates present in all three attach modules (`store-devtools.ts:69`, `query-devtools.ts:20`, `router-log.ts:21`)
- `sideEffects:false` in `packages/devtools/package.json`; leaf-rule CI gate `scripts/check-devtools-leaf.mjs` present
- malformed-state `JSON.parse` guarded (`store-devtools.ts:94-98`); feedback-loop `isTimeTravel` flag present
- query panel teardown removes host node on both dispose and mount-failure paths

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-23
