---
status: complete
phase: 10-examples-integration-app
source: [10-VERIFICATION.md]
started: 2026-08-22T20:20:20Z
updated: 2026-08-23T01:34:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Store seam — `/` renders <home-view>, counter increments on click
expected: Run `npm run dev -w examples`, open http://localhost:5173/, click the counter button. <home-view> mounts under the outlet and the count increments on each click (store slice re-renders the host).
result: pass

### 2. Query seam — `/data` renders <data-view>, mock todos resolve
expected: In the dev server, click the Data nav link (or visit /data). <data-view> mounts; status transitions pending → success and the three mock todos render in the list (QueryController reading the DOM-context QueryClient).
result: pass

### 3. Forms seam — `/form` renders <form-view>, validation fires
expected: In the dev server, click the Form nav link (or visit /form); submit empty, then enter an invalid email and a short password. <form-view> mounts; validation error text appears via field() for required/email/minLength failures; a valid submit logs the value.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
