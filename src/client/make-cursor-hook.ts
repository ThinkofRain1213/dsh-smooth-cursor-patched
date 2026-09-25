/**
 * App-local snapshot-to-React binding for the configuration panel, built directly on
 * React 18's stable `useSyncExternalStore`. This deliberately replaces the
 * official `bindSnapshotSelector` (from `@deepseek-ai/dsh-client-ui-renderer`)
 * so the plugin depends only on the stable ObservableSnapshot contract shipped
 * by `@deepseek-ai/dsh-client-runtime/client` plus React core — not on the
 * rename-prone internal renderer package. Keeps the plugin cross-version.
 */
import { useSyncExternalStore } from 'react'

/** Minimal observable contract (matches the runtime's ObservableSnapshot). */
export interface ObservableSnapshot<T> {
  getSnapshot(): T
  subscribe(fn: () => void): () => void
}

/**
 * Create a component-safe selector hook over an observable snapshot store.
 * Each store notification re-reads the state and recomputes the selector.
 *
 * @param store - the observable snapshot store (e.g. a CursorController.state).
 * @returns a hook of the same shape as the official bindSnapshotSelector.
 */
export function bindSnapshotSelector<T>(store: ObservableSnapshot<T>) {
  return function useSnapshotSelector<S>(selector: (state: T) => S): S {
    return useSyncExternalStore(
      store.subscribe.bind(store),
      () => selector(store.getSnapshot()),
    )
  }
}