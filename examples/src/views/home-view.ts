import { KitElement, define } from '@willramdev/kit'
import { createStore, storeSlice } from '@willramdev/store'
import { html } from 'lit'

// STORE seam: a module-level store, subscribed via storeSlice() as a reactive
// controller registered through KitElement's `use()`. The controller's read
// accessor is the `.value` getter; it only re-renders the host when the selected
// slice changes. Mutate through `update()`.
const counter = createStore({ count: 0 })

class HomeView extends KitElement {
  #count = this.use(storeSlice(this, counter, (s) => s.count))

  render() {
    return html`
      <h1>Home</h1>
      <button @click=${() => counter.update((s) => ({ count: s.count + 1 }))}>
        count: ${this.#count.value}
      </button>
    `
  }
}

define('home-view', HomeView)
