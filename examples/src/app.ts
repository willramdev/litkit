import { KitElement, define } from '@willramdev/kit'
import { html } from 'lit'
import { router } from './router.ts'

// The router shell: <router-provider> receives the Router through a PROPERTY
// binding (`.router=` — it is attribute:false and throws if unset), wraps the
// nav and the <router-outlet> that mounts the matched route element.
// <router-link> navigates via its `to` attribute (NOT `href`) and auto-resolves
// its Router from the ancestor provider's DOM context.
class ExamplesApp extends KitElement {
  render() {
    return html`
      <router-provider .router=${router}>
        <nav>
          <router-link to="/">Home</router-link>
          <router-link to="/data">Data</router-link>
          <router-link to="/form">Form</router-link>
        </nav>
        <router-outlet></router-outlet>
      </router-provider>
    `
  }
}

define('examples-app', ExamplesApp)
