/** A node in the reactive dependency graph. */
export interface ReactiveNode {
  depth: number;
  dirty: boolean;
  dependents: Set<ReactiveNode>;
  /** Recompute value. Return true if the value changed. */
  update: () => boolean;
  /** Fire external listeners. */
  notify: () => void;
}

export interface NodeInfo {
  node: ReactiveNode;
  activate?: () => void;
  deactivate?: () => void;
}

/** Maps store/derived objects to their graph nodes. */
export const nodeInfoMap = new WeakMap<object, NodeInfo>();

const dirtyNodes = new Set<ReactiveNode>();
let batchDepth = 0;
let flushing = false;

/**
 * Mark a node and all its transitive dependents as dirty.
 */
export function markDirty(node: ReactiveNode): void {
  node.dirty = true;
  dirtyNodes.add(node);
  for (const dep of node.dependents) {
    if (!dep.dirty) {
      markDirty(dep);
    }
  }
}

/**
 * Trigger a synchronous flush unless we're inside a batch or already flushing.
 */
export function triggerFlush(): void {
  if (batchDepth > 0 || flushing) return;
  flush();
}

/**
 * Process all dirty nodes in topological order (by depth).
 * Derived values are recomputed before any external listeners fire.
 * Re-entrant set() calls during notification add new dirty nodes,
 * which are processed in subsequent iterations of the while loop.
 */
function flush(): void {
  if (flushing) return;
  flushing = true;
  try {
    while (dirtyNodes.size > 0) {
      const sorted = [...dirtyNodes].sort((a, b) => a.depth - b.depth);
      dirtyNodes.clear();

      const toNotify: ReactiveNode[] = [];
      for (const node of sorted) {
        node.dirty = false;
        try {
          if (node.update()) {
            toNotify.push(node);
          }
        } catch (e) {
          console.error('Reactive node update error:', e);
        }
      }

      for (const node of toNotify) {
        node.notify();
      }
    }
  } finally {
    flushing = false;
  }
}

/**
 * Batch multiple store updates into a single flush cycle.
 * Subscribers are notified once when the batch completes.
 */
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flush();
    }
  }
}
