import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import {
  MutationController,
  QueryController,
  createQueryClient,
} from './index'
import './query-client-provider'
import './index.css'

type Todo = {
  id: number
  title: string
  completed: boolean
}

let nextTodoId = 4
let todoStore: Todo[] = [
  { id: 1, title: 'Wrap QueryObserver in a Lit controller', completed: true },
  { id: 2, title: 'Resolve QueryClient from the DOM tree', completed: true },
  { id: 3, title: 'Ship a demo that mutates cached state', completed: false },
]

const demoClient = createQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
    },
  },
})

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function fetchTodos(): Promise<Todo[]> {
  await delay(350)
  return todoStore.map((todo) => ({ ...todo }))
}

async function addTodo(title: string): Promise<Todo> {
  await delay(250)

  const todo = {
    id: nextTodoId++,
    title,
    completed: false,
  }

  todoStore = [todo, ...todoStore]
  return { ...todo }
}

async function toggleTodo(id: number): Promise<Todo> {
  await delay(200)

  const existingTodo = todoStore.find((todo) => todo.id === id)

  if (!existingTodo) {
    throw new Error(`Todo ${id} was not found.`)
  }

  const updatedTodo = {
    ...existingTodo,
    completed: !existingTodo.completed,
  }

  todoStore = todoStore.map((todo) => (todo.id === id ? updatedTodo : todo))
  return updatedTodo
}

@customElement('lit-query-demo-app')
export class LitQueryDemoApp extends LitElement {
  render() {
    return html`
      <lit-query-client-provider .client=${demoClient}>
        <lit-query-demo-surface></lit-query-demo-surface>
      </lit-query-client-provider>
    `
  }
}

@customElement('lit-query-demo-surface')
class LitQueryDemoSurface extends LitElement {
  @state()
  private draft = 'Document the mutation controller'

  private readonly todosQuery = new QueryController(this, () => ({
    queryKey: ['demo', 'todos'] as const,
    queryFn: fetchTodos,
  }))

  private readonly addTodoMutation = new MutationController(this, () => ({
    mutationKey: ['demo', 'addTodo'] as const,
    mutationFn: (title: string) => addTodo(title),
    onSuccess: (todo, _title, _onMutateResult, context) => {
      context.client.setQueryData<Todo[]>(['demo', 'todos'], (current = []) => [
        todo,
        ...current,
      ])
      this.draft = ''
    },
  }))

  private readonly toggleTodoMutation = new MutationController(this, () => ({
    mutationKey: ['demo', 'toggleTodo'] as const,
    mutationFn: (id: number) => toggleTodo(id),
    onSuccess: (todo, id, _onMutateResult, context) => {
      context.client.setQueryData<Todo[]>(['demo', 'todos'], (current = []) =>
        current.map((entry) => (entry.id === id ? todo : entry)),
      )
    },
  }))

  render() {
    const todosQuery = this.todosQuery.result
    const addTodoMutation = this.addTodoMutation.result
    const toggleTodoMutation = this.toggleTodoMutation.result
    const todos = todosQuery.data ?? []

    return html`
      <main class="shell">
        <section class="intro">
          <p class="eyebrow">Lit Query</p>
          <h1>TanStack Query controllers for Lit.</h1>
          <p class="lede">
            This demo uses <code>QueryObserver</code> and
            <code>MutationObserver</code> from
            <code>@tanstack/query-core</code>, with the client resolved through
            the DOM via <code>&lt;lit-query-client-provider&gt;</code>.
          </p>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="label">Todos Query</p>
              <strong>${todosQuery.status}</strong>
              <span class=${todosQuery.isFetching ? 'badge active' : 'badge'}>
                ${todosQuery.isFetching ? 'Fetching' : 'Idle'}
              </span>
            </div>

            <button
              type="button"
              class="button secondary"
              @click=${this.#refetchTodos}
            >
              Refetch
            </button>
          </div>

          ${todosQuery.isError
            ? html`
                <p class="error">
                  ${(todosQuery.error as Error).message}
                </p>
              `
            : null}

          <form class="composer" @submit=${this.#submitTodo}>
            <label>
              <span>Add a todo</span>
              <input
                .value=${this.draft}
                @input=${this.#updateDraft}
                placeholder="Describe the next API improvement"
              />
            </label>

            <button
              type="submit"
              class="button"
              ?disabled=${addTodoMutation.isPending}
            >
              ${addTodoMutation.isPending ? 'Saving...' : 'Create todo'}
            </button>
          </form>

          <ul class="todo-list">
            ${todos.map(
              (todo) => html`
                <li class=${todo.completed ? 'todo complete' : 'todo'}>
                  <button
                    type="button"
                    class="toggle"
                    @click=${() => this.#toggleTodo(todo.id)}
                    ?disabled=${toggleTodoMutation.isPending}
                    aria-label=${todo.completed
                      ? `Mark ${todo.title} as incomplete`
                      : `Mark ${todo.title} as complete`}
                  >
                    ${todo.completed ? 'Done' : 'Open'}
                  </button>

                  <div>
                    <strong>${todo.title}</strong>
                    <p>
                      ${todo.completed
                        ? 'Updated through the mutation controller.'
                        : 'Click to run a mutation and patch the cached query.'}
                    </p>
                  </div>
                </li>
              `,
            )}
          </ul>
        </section>
      </main>
    `
  }

  static styles = css`
    :host {
      display: block;
    }

    .shell {
      width: min(960px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 64px 0 80px;
      display: grid;
      gap: 28px;
    }

    .intro,
    .panel {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 28px;
      backdrop-filter: blur(20px);
      background:
        linear-gradient(160deg, rgba(255, 255, 255, 0.92), rgba(241, 245, 249, 0.86)),
        rgba(255, 255, 255, 0.8);
      box-shadow:
        0 28px 60px rgba(15, 23, 42, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
    }

    .intro {
      padding: 32px;
    }

    .panel {
      padding: 28px;
      display: grid;
      gap: 20px;
    }

    .eyebrow,
    .label {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 0.75rem;
      color: #9a3412;
    }

    h1 {
      margin: 12px 0 10px;
      font-size: clamp(2.6rem, 6vw, 4.8rem);
      line-height: 0.95;
      letter-spacing: -0.06em;
      color: #0f172a;
    }

    .lede {
      margin: 0;
      max-width: 62ch;
      color: #334155;
    }

    code {
      font-family:
        'IBM Plex Mono',
        'SFMono-Regular',
        Consolas,
        monospace;
      font-size: 0.92em;
      padding: 0.18rem 0.42rem;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.14);
      color: #0f172a;
    }

    .panel-header {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      align-items: center;
    }

    .panel-header strong {
      display: inline-block;
      margin-right: 10px;
      color: #0f172a;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.28rem 0.7rem;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.14);
      color: #475569;
      font-size: 0.85rem;
    }

    .badge.active {
      background: rgba(245, 158, 11, 0.16);
      color: #b45309;
    }

    .composer {
      display: grid;
      gap: 14px;
    }

    .composer label {
      display: grid;
      gap: 8px;
      color: #334155;
      font-size: 0.95rem;
    }

    .composer input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.95rem 1rem;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.38);
      background: rgba(255, 255, 255, 0.84);
      color: #0f172a;
      font: inherit;
    }

    .composer input:focus-visible,
    .button:focus-visible,
    .toggle:focus-visible {
      outline: 2px solid rgba(234, 88, 12, 0.9);
      outline-offset: 2px;
    }

    .button,
    .toggle {
      font: inherit;
      cursor: pointer;
      border: 0;
      transition:
        transform 140ms ease,
        background-color 140ms ease,
        opacity 140ms ease;
    }

    .button {
      justify-self: start;
      padding: 0.9rem 1.2rem;
      border-radius: 999px;
      background: linear-gradient(135deg, #ea580c, #fb7185);
      color: white;
      box-shadow: 0 12px 24px rgba(251, 113, 133, 0.28);
    }

    .button.secondary {
      background: rgba(15, 23, 42, 0.05);
      color: #0f172a;
      box-shadow: none;
    }

    .button:hover,
    .toggle:hover {
      transform: translateY(-1px);
    }

    .button:disabled,
    .toggle:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }

    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 12px;
    }

    .todo {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 16px;
      align-items: start;
      padding: 18px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.22);
    }

    .todo.complete {
      background: rgba(236, 253, 245, 0.88);
      border-color: rgba(16, 185, 129, 0.24);
    }

    .todo strong {
      display: block;
      margin-bottom: 6px;
      color: #0f172a;
    }

    .todo p,
    .error {
      margin: 0;
      color: #475569;
    }

    .error {
      color: #b91c1c;
    }

    .toggle {
      min-width: 72px;
      padding: 0.72rem 0.9rem;
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.06);
      color: #0f172a;
    }

    @media (max-width: 720px) {
      .shell {
        padding: 28px 0 56px;
      }

      .intro,
      .panel {
        padding: 22px;
        border-radius: 22px;
      }

      .panel-header {
        flex-direction: column;
        align-items: start;
      }

      .todo {
        grid-template-columns: 1fr;
      }
    }
  `

  #refetchTodos = () => {
    void this.todosQuery.refetch()
  }

  #submitTodo = (event: Event) => {
    event.preventDefault()

    const title = this.draft.trim()

    if (!title || this.addTodoMutation.result.isPending) {
      return
    }

    void this.addTodoMutation.mutate(title)
  }

  #toggleTodo(id: number) {
    if (this.toggleTodoMutation.result.isPending) {
      return
    }

    void this.toggleTodoMutation.mutate(id)
  }

  #updateDraft = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    this.draft = input.value
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-query-demo-app': LitQueryDemoApp
    'lit-query-demo-surface': LitQueryDemoSurface
  }
}
