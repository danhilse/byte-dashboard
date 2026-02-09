"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY_PREFIX = "byte-view-"

function getStorageKey(page: string) {
  return `${STORAGE_KEY_PREFIX}${page}`
}

function getSnapshot(page: string, fallback: string): () => string {
  return () => {
    try {
      return localStorage.getItem(getStorageKey(page)) ?? fallback
    } catch {
      return fallback
    }
  }
}

function getServerSnapshot(fallback: string): () => string {
  return () => fallback
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

export function usePersistedView<T extends string>(
  page: string,
  fallback: T
): [T, (view: T) => void] {
  const view = useSyncExternalStore(
    subscribe,
    getSnapshot(page, fallback),
    getServerSnapshot(fallback)
  ) as T

  const setView = useCallback(
    (newView: T) => {
      try {
        localStorage.setItem(getStorageKey(page), newView)
      } catch {
        // localStorage unavailable
      }
      // Dispatch storage event so other tabs/instances sync
      window.dispatchEvent(new Event("storage"))
    },
    [page]
  )

  return [view, setView]
}
