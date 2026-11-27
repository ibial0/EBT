import { useSyncExternalStore } from 'react'

/**
 * Theme is a document-level attribute, not React state: the inline script in index.html sets it
 * before the first paint (no flash), and every consumer reads the same source of truth.
 *
 * `dark` is the default for a first visit. A choice is persisted and wins on later visits.
 */
export type Theme = 'dark' | 'light'

const KEY = 'ebt.theme'
const listeners = new Set<() => void>()

function readDocument(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

let current: Theme = readDocument()

export function getTheme(): Theme {
  return current
}

export function setTheme(next: Theme): void {
  if (next === current) return
  current = next
  const apply = () => {
    const root = document.documentElement
    root.dataset.theme = next
    root.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* storage is optional */
    }
  }
  /**
   * One cross-fade of the whole viewport (View Transitions), the way large products switch
   * themes. Per-element colour transitions stutter on a screen this dense; a single snapshot
   * fade stays smooth. Browsers without the API switch instantly.
   */
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(apply)
  } else {
    apply()
  }
  listeners.forEach((l) => l())
}

export function toggleTheme(): void {
  setTheme(current === 'dark' ? 'light' : 'dark')
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => 'dark' as Theme,
  )
}
