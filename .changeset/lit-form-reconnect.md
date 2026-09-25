---
"@willramdev/forms": patch
---

fix(forms): a `<lit-form>` that is moved in the DOM (disconnected and reconnected) keeps wiring its native form's `submit` and `reset` to the form instance. Previously it removed those listeners on disconnect and never added them back.
