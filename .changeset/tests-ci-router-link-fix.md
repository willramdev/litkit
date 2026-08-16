---
"@willram/router": patch
---

Fix `link()` directive resource leaks: remove the stale event listener when a
`link()` binding disconnects (previously the click handler was left attached to
the host element), and drop the duplicate router subscription that was
registered on every re-render. Both are memory-leak fixes with no public API
change.
