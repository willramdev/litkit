import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { defineRoutes, createRouter } from "../router-core/index.ts";
import { link, RouteController } from "../router-lit/index.ts";
import "../router-lit/router-outlet.ts";
import type { RouteMatch, RouterNavigationError } from "../router-core/types.ts";

// ---------------------------------------------------------------
// Simulated auth state (for guard demo)
// ---------------------------------------------------------------

let isLoggedIn = false;

// ---------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------

const routes = defineRoutes([
  {
    path: "/",
    name: "home",
    component: "page-home",
  },
  {
    path: "/users",
    name: "users",
    component: "page-users",
  },
  {
    path: "/users/:id",
    name: "user-detail",
    component: "page-user-detail",
  },
  {
    path: "/admin",
    name: "admin",
    component: "page-admin-layout",
    children: [
      {
        path: "dashboard",
        name: "admin-dashboard",
        component: "page-admin-dashboard",
      },
      {
        path: "settings",
        name: "admin-settings",
        component: "page-admin-settings",
      },
    ],
  },
  {
    path: "/protected",
    name: "protected",
    component: "page-protected",
    beforeEnter: (_to: RouteMatch, _from: RouteMatch | null) => {
      if (!isLoggedIn) return "/login";
      return true;
    },
  },
  {
    path: "/login",
    name: "login",
    component: "page-login",
  },
  {
    path: "/lazy",
    name: "lazy",
    component: "page-lazy",
    load: () =>
      new Promise<void>((resolve) => {
        // Simulate network delay
        setTimeout(() => {
          // Dynamically define the element if not already defined
          if (!customElements.get("page-lazy")) {
            @customElement("page-lazy")
            // @ts-ignore dynamically defined class
            class PageLazy extends LitElement {
              render() {
                return html`
                  <h2>Lazy-loaded Page</h2>
                  <p>This component was loaded on demand via the route's <code>load()</code> hook.</p>
                  <p>The element definition was deferred until you navigated here.</p>
                `;
              }
            }
          }
          resolve();
        }, 800);
      }),
  },
  {
    path: "/error-demo",
    name: "error-demo",
    component: "page-error-thrower",
    load: () => Promise.reject(new Error("Failed to load module: network error (simulated)")),
  },
  {
    path: "/scroll-demo",
    name: "scroll-demo",
    component: "page-scroll-demo",
  },
  {
    path: "/about",
    name: "about",
    render: () => html`
      <h2>About</h2>
      <p>This router was built for Lit and web components.</p>
      <h3>Features demonstrated</h3>
      <ul>
        <li>Nested routes with layout components</li>
        <li>Navigation guards (beforeEnter / beforeLeave)</li>
        <li>Lazy loading with <code>load()</code> hooks</li>
        <li>Scroll restoration across navigations</li>
        <li>Error boundary via <code>router-error</code> event</li>
        <li>Active link CSS classes</li>
        <li>Redirects</li>
        <li>Named routes with params</li>
        <li>Render functions</li>
        <li>Catch-all 404</li>
      </ul>
    `,
  },
  {
    path: "/old-home",
    name: "old-home",
    redirectTo: "/",
  },
  {
    path: "*",
    name: "not-found",
    render: () => html`<h2>404</h2><p>Page not found.</p>`,
  },
]);

// ---------------------------------------------------------------
// Create router
// ---------------------------------------------------------------

// Error state shared between router and app shell
let onRouterError: ((msg: string) => void) | undefined;

const router = createRouter({
  routes,
  scrollBehavior: "auto",
  onError: (err: RouterNavigationError) => {
    const msg = err.error instanceof Error ? err.error.message : String(err.error);
    console.error(`[demo] Router ${err.type} error:`, err.error);
    onRouterError?.(`${err.type} error: ${msg}`);
  },
});

// Make accessible globally for debugging
(window as unknown as Record<string, unknown>).__router = router;

// ---------------------------------------------------------------
// App shell
// ---------------------------------------------------------------

@customElement("example-app")
export class ExampleApp extends LitElement {
  private routeCtrl = new RouteController(this, router);

  @state()
  private routerError: string | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 1.5rem;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    nav a {
      color: #333;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 14px;
      transition: background 0.15s;
    }
    nav a:hover {
      background: #f0f0f0;
    }
    nav a.active {
      background: #e8e8f8;
    }
    nav a.exact-active {
      background: #d0d0ff;
      font-weight: 600;
    }
    .error-banner {
      background: #fee;
      border: 1px solid #fcc;
      color: #c00;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .error-banner button {
      background: none;
      border: 1px solid #c00;
      color: #c00;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    .route-info {
      margin-top: 32px;
      padding: 16px;
      background: #f8f8f8;
      border-radius: 8px;
      font-size: 13px;
      font-family: monospace;
      line-height: 1.6;
      border: 1px solid #eee;
    }
    .route-info strong {
      color: #555;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      background: #e0e0e0;
      color: #555;
      margin-left: 4px;
      vertical-align: middle;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Listen for render errors bubbling from router-outlet
    this.addEventListener("router-error", ((e: CustomEvent) => {
      this.routerError = `render error: ${e.detail.error}`;
    }) as EventListener);
    // Listen for router-level errors (guard failures, load failures)
    onRouterError = (msg: string) => {
      this.routerError = msg;
    };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    onRouterError = undefined;
  }

  render() {
    const match = this.routeCtrl.match;

    return html`
      <header>
        <h1>Lit Router Demo</h1>
        <nav>
          <a ${link("/", router)}>Home</a>
          <a ${link("/users", router)}>Users</a>
          <a ${link("/admin/dashboard", router)}>Admin</a>
          <a ${link("/protected", router)}>Protected <span class="badge">guard</span></a>
          <a ${link("/lazy", router)}>Lazy <span class="badge">load()</span></a>
          <a ${link("/scroll-demo", router)}>Scroll <span class="badge">restore</span></a>
          <a ${link("/error-demo", router)}>Error <span class="badge">boundary</span></a>
          <a ${link("/about", router)}>About</a>
        </nav>
      </header>

      ${this.routerError
        ? html`
            <div class="error-banner">
              <span>${this.routerError}</span>
              <button @click=${() => { this.routerError = null; router.navigate("/"); }}>Dismiss</button>
            </div>
          `
        : nothing}

      <router-outlet .router=${router}></router-outlet>

      <div class="route-info">
        <strong>Route:</strong> ${match?.name ?? "none"}<br>
        <strong>Path:</strong> ${match?.pathname}<br>
        <strong>Params:</strong> ${JSON.stringify(match?.params)}<br>
        <strong>Query:</strong> ${JSON.stringify(match?.query)}<br>
        <strong>Matched chain:</strong> ${match?.matched.map((m) => m.route.name ?? m.route.path).join(" → ")}
      </div>
    `;
  }
}

// ---------------------------------------------------------------
// Page: Home (with long content for scroll demo)
// ---------------------------------------------------------------

@customElement("page-home")
export class PageHome extends LitElement {
  render() {
    return html`
      <h2>Home</h2>
      <p>Welcome to the <strong>@willramdev/router</strong> demo. Use the navigation above to explore features.</p>

      <h3>Feature highlights</h3>
      <dl>
        <dt>Nested Routes</dt>
        <dd>The <em>Admin</em> section uses a layout component with a nested <code>&lt;router-outlet&gt;</code>.</dd>

        <dt>Navigation Guards</dt>
        <dd>The <em>Protected</em> link uses <code>beforeEnter</code> to redirect unauthenticated users to login.</dd>

        <dt>Lazy Loading</dt>
        <dd>The <em>Lazy</em> page uses <code>load()</code> to defer its component definition until navigation.</dd>

        <dt>Scroll Restoration</dt>
        <dd>The <em>Scroll</em> page has tall content. Scroll down, navigate away, then press back — your position is restored.</dd>

        <dt>Error Boundary</dt>
        <dd>The <em>Error</em> page has a <code>load()</code> that rejects, simulating a network failure. The router's <code>onError</code> callback surfaces it as a banner.</dd>

        <dt>Active Link Classes</dt>
        <dd>Links automatically get <code>.active</code> (prefix match) and <code>.exact-active</code> (exact match) CSS classes.</dd>
      </dl>
    `;
  }
}

// ---------------------------------------------------------------
// Page: Users
// ---------------------------------------------------------------

@customElement("page-users")
export class PageUsers extends LitElement {
  render() {
    return html`
      <h2>Users</h2>
      <ul>
        ${[1, 2, 3, 4, 5].map(
          (id) => html`
            <li><a ${link(`/users/${id}`, router)}>User ${id}</a></li>
          `,
        )}
      </ul>
      <p><small>Notice: the "Users" nav link stays <code>.active</code> when viewing a user detail page (prefix match).</small></p>
    `;
  }
}

// ---------------------------------------------------------------
// Page: User Detail
// ---------------------------------------------------------------

@customElement("page-user-detail")
export class PageUserDetail extends LitElement {
  declare params: Record<string, string>;
  declare route: RouteMatch;

  static properties = {
    params: { type: Object },
    route: { type: Object },
  };

  render() {
    return html`
      <h2>User Detail</h2>
      <p>Viewing user <strong>#${this.params?.id}</strong></p>
      <p>
        Navigate:
        ${[1, 2, 3, 4, 5]
          .filter((id) => String(id) !== this.params?.id)
          .map((id) => html`<a ${link(`/users/${id}`, router)} style="margin-right:8px">User ${id}</a>`)}
      </p>
      <a ${link("/users", router)}>Back to users</a>
    `;
  }
}

// ---------------------------------------------------------------
// Page: Admin Layout (nested routes)
// ---------------------------------------------------------------

@customElement("page-admin-layout")
export class PageAdminLayout extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .admin-shell {
      border: 2px solid #7c6cff;
      border-radius: 8px;
      overflow: hidden;
    }
    .admin-header {
      background: #7c6cff;
      color: white;
      padding: 12px 16px;
      font-weight: 600;
    }
    .admin-body {
      display: flex;
      min-height: 200px;
    }
    .admin-sidebar {
      width: 160px;
      background: #f4f3ff;
      padding: 12px;
      border-right: 1px solid #e0dcff;
    }
    .admin-sidebar a {
      display: block;
      padding: 6px 8px;
      margin-bottom: 4px;
      text-decoration: none;
      color: #333;
      border-radius: 4px;
    }
    .admin-sidebar a:hover {
      background: #e8e4ff;
    }
    .admin-sidebar a.exact-active {
      background: #d0c8ff;
      font-weight: 600;
    }
    .admin-content {
      flex: 1;
      padding: 16px;
    }
  `;

  render() {
    return html`
      <div class="admin-shell">
        <div class="admin-header">Admin Panel</div>
        <div class="admin-body">
          <nav class="admin-sidebar">
            <a ${link("/admin/dashboard", router)}>Dashboard</a>
            <a ${link("/admin/settings", router)}>Settings</a>
          </nav>
          <div class="admin-content">
            <router-outlet></router-outlet>
          </div>
        </div>
      </div>
      <p style="margin-top: 12px; font-size: 13px; color: #888;">
        This layout uses a nested <code>&lt;router-outlet&gt;</code> at depth 1. The child route
        component renders inside the admin panel's content area.
      </p>
    `;
  }
}

@customElement("page-admin-dashboard")
export class PageAdminDashboard extends LitElement {
  render() {
    return html`
      <h3>Dashboard</h3>
      <p>Welcome to the admin dashboard.</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
        <div style="background:#f0f0f0; padding:16px; border-radius:6px;">
          <strong>Users</strong><br>1,234
        </div>
        <div style="background:#f0f0f0; padding:16px; border-radius:6px;">
          <strong>Revenue</strong><br>$56,789
        </div>
      </div>
    `;
  }
}

@customElement("page-admin-settings")
export class PageAdminSettings extends LitElement {
  render() {
    return html`
      <h3>Settings</h3>
      <p>Admin settings page. Both child routes share the same admin layout shell.</p>
      <label style="display:block; margin-top:12px;">
        <input type="checkbox" disabled> Enable notifications
      </label>
      <label style="display:block; margin-top:8px;">
        <input type="checkbox" checked disabled> Dark mode
      </label>
    `;
  }
}

// ---------------------------------------------------------------
// Page: Login
// ---------------------------------------------------------------

@customElement("page-login")
export class PageLogin extends LitElement {
  render() {
    return html`
      <h2>Login</h2>
      <p>You were redirected here by the <code>beforeEnter</code> guard because you are not logged in.</p>
      <button @click=${this.login} style="padding:8px 16px; font-size:14px; cursor:pointer;">
        Log in (simulated)
      </button>
    `;
  }

  private login() {
    isLoggedIn = true;
    router.navigate("/protected");
  }
}

// ---------------------------------------------------------------
// Page: Protected
// ---------------------------------------------------------------

@customElement("page-protected")
export class PageProtected extends LitElement {
  render() {
    return html`
      <h2>Protected Page</h2>
      <p>You are authenticated! This page is guarded by <code>beforeEnter</code>.</p>
      <button @click=${this.logout} style="padding:8px 16px; font-size:14px; cursor:pointer;">
        Log out
      </button>
    `;
  }

  private logout() {
    isLoggedIn = false;
    router.navigate("/");
  }
}

// ---------------------------------------------------------------
// Page: Scroll Demo (tall content for scroll restoration)
// ---------------------------------------------------------------

@customElement("page-scroll-demo")
export class PageScrollDemo extends LitElement {
  render() {
    const sections = Array.from({ length: 20 }, (_, i) => i + 1);
    return html`
      <h2>Scroll Restoration Demo</h2>
      <p>Scroll down through the sections below, then navigate to another page and press the browser back button.
         Your scroll position will be restored automatically.</p>
      ${sections.map(
        (n) => html`
          <div style="padding:24px; margin:12px 0; background:hsl(${n * 18}, 70%, 95%); border-radius:8px; border:1px solid hsl(${n * 18}, 50%, 85%);">
            <h3 style="margin:0 0 8px;">Section ${n}</h3>
            <p style="margin:0; color:#555;">
              This is section ${n} of 20. The router saves <code>scrollX</code>/<code>scrollY</code> in
              <code>history.state</code> before each navigation, and restores it on popstate.
            </p>
          </div>
        `,
      )}
      <p style="text-align:center; padding:24px; color:#888;">
        End of scrollable content. Navigate away and come back to test restoration.
      </p>
    `;
  }
}

// ---------------------------------------------------------------
// Note: page-lazy is defined inside the load() hook above.
// page-error-thrower is never defined — its load() rejects to
// demonstrate the router's onError callback and error banner.
// ---------------------------------------------------------------

declare global {
  interface HTMLElementTagNameMap {
    "example-app": ExampleApp;
    "page-home": PageHome;
    "page-users": PageUsers;
    "page-user-detail": PageUserDetail;
    "page-admin-layout": PageAdminLayout;
    "page-admin-dashboard": PageAdminDashboard;
    "page-admin-settings": PageAdminSettings;
    "page-login": PageLogin;
    "page-protected": PageProtected;
    "page-scroll-demo": PageScrollDemo;
  }
}
