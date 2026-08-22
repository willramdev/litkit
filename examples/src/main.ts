// Side-effect bootstrap. Registration order matters: every route-target custom
// element MUST be defined BEFORE <router-outlet> first navigates, or the outlet
// silently warns and renders nothing (there is no build-time error for this).
import '@willramdev/router' // registers <router-provider>, <router-outlet>, <router-link>
import './app.ts' // registers <examples-app>
import './views/home-view.ts' // registers <home-view> — MUST run before nav

document.body.appendChild(document.createElement('examples-app'))
