---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-08-22T18:22:50.372Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 03 | deviation | packages/forms/src/bind.ts |  | bind()/field() typed FormInstance<any> reject a concrete FormController<T> (group keyof-T variance); docs use lit-form context pattern as workaround | open |  | 2026-08-18T01:45:27.861Z |  |
| 2 | 09 | deviation | .vscode/settings.json |  | CEM-04 D-08 dogfood settings.json created but uncommitted (repo .gitignore ignores .vscode/*); live VS Code/JetBrains autocomplete rendering is manual spot-check only, not machine-verified in-phase (FLAGGED CEM-04 edge probe) | open |  | 2026-08-22T18:22:50.372Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "03",
    "file": "packages/forms/src/bind.ts",
    "line": null,
    "description": "bind()/field() typed FormInstance<any> reject a concrete FormController<T> (group keyof-T variance); docs use lit-form context pattern as workaround",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-18T01:45:27.861Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "09",
    "file": ".vscode/settings.json",
    "line": null,
    "description": "CEM-04 D-08 dogfood settings.json created but uncommitted (repo .gitignore ignores .vscode/*); live VS Code/JetBrains autocomplete rendering is manual spot-check only, not machine-verified in-phase (FLAGGED CEM-04 edge probe)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-22T18:22:50.372Z",
    "resolved_at": null
  }
]
````
