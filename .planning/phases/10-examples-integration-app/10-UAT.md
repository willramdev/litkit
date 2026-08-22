---
status: testing
phase: 10-examples-integration-app
source: [10-VERIFICATION.md]
started: 2026-08-22T20:20:20Z
updated: 2026-08-22T20:20:20Z
---

## Current Test

number: 1
name: Store seam — `/` renders <home-view>, counter increments on click
expected: |
  <home-view> mounts under the <router-outlet>; the count increments on each
  button click (the @willramdev/store slice re-renders the host via storeSlice/.value).
awaiting: user response

## Tests

### 1. Store seam — `/` renders <home-view>, counter increments on click
expected: Run `npm run dev -w examples`, open http://localhost:5173/, click the counter button. <home-view> mounts under the outlet and the count increments on each click (store slice re-renders the host).
result: [pending]

### 2. Query seam — `/data` renders <data-view>, mock todos resolve
expected: In the dev server, click the Data nav link (or visit /data). <data-view> mounts; status transitions pending → success and the three mock todos render in the list (QueryController reading the DOM-context QueryClient).
result: [pending]

### 3. Forms seam — `/form` renders <form-view>, validation fires
expected: In the dev server, click the Form nav link (or visit /form); submit empty, then enter an invalid email and a short password. <form-view> mounts; validation error text appears via field() for required/email/minLength failures; a valid submit logs the value.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
