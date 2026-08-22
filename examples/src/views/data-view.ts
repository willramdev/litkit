import { KitElement, define } from '@willramdev/kit'
import { createQueryClient, QueryController } from '@willramdev/query'
import { LitElement, html } from 'lit'

// QUERY seam. Mirrors packages/query/src/demo.ts's provider/consumer split:
// one QueryClient is created at module scope and handed to descendants through
// <lit-query-client-provider> (property binding, attribute:false), and the
// consumer element resolves it back out of the DOM via a directly-instantiated
// QueryController (no factory) — exactly the demo.ts:90 shape.

type Todo = {
  id: number
  title: string
  completed: boolean
}

// In-memory mock data source — no real network call (matches this phase's
// no-external-API scope), mirroring demo.ts's mock todoStore.
const todoStore: Todo[] = [
  { id: 1, title: 'Wrap QueryObserver in a Lit controller', completed: true },
  { id: 2, title: 'Resolve QueryClient from the DOM tree', completed: true },
  { id: 3, title: 'Ship a demo that mutates cached state', completed: false },
]

async function fetchTodos(): Promise<Todo[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 350))
  return todoStore.map((todo) => ({ ...todo }))
}

// One client for the whole seam — dedupe canary depends on there being a single
// @tanstack/query-core instance backing this.
const client = createQueryClient({
  defaultOptions: { queries: { staleTime: 15_000 } },
})

// Consumer: a raw LitElement (following demo.ts, which instantiates
// QueryController directly rather than through KitElement's use()).
class DataSurface extends LitElement {
  private readonly todosQuery = new QueryController(this, () => ({
    queryKey: ['todos'] as const,
    queryFn: fetchTodos,
  }))

  render() {
    const q = this.todosQuery.result
    return html`
      <h1>Data</h1>
      <p>status: <strong>${q.status}</strong></p>
      <ul>
        ${(q.data ?? []).map(
          (todo) => html`<li>${todo.completed ? '[x]' : '[ ]'} ${todo.title}</li>`,
        )}
      </ul>
    `
  }
}

define('data-surface', DataSurface)

// Provider: the route-target element wraps the consumer in the client provider.
class DataView extends KitElement {
  render() {
    return html`
      <lit-query-client-provider .client=${client}>
        <data-surface></data-surface>
      </lit-query-client-provider>
    `
  }
}

define('data-view', DataView)
