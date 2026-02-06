/**
 * Data fetching hooks - ready for backend integration
 *
 * When adding real APIs, consider using SWR or TanStack Query:
 *
 * npm install swr
 * or
 * npm install @tanstack/react-query
 *
 * Example with SWR:
 * ```
 * import useSWR from 'swr'
 *
 * const fetcher = (url: string) => fetch(url).then(res => res.json())
 *
 * export function useContacts() {
 *   const { data, error, isLoading, mutate } = useSWR('/api/contacts', fetcher)
 *   return { contacts: data, error, isLoading, refresh: mutate }
 * }
 * ```
 */

import { useCallback, useEffect, useState, useTransition } from "react"

/**
 * Generic hook for optimistic updates with transitions
 * Use when mutating data to keep UI responsive
 */
export function useOptimisticAction<T>(
  action: (data: T) => Promise<void>,
  onSuccess?: () => void,
  onError?: (error: Error) => void
) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(
    (data: T) => {
      setError(null)
      startTransition(async () => {
        try {
          await action(data)
          onSuccess?.()
        } catch (e) {
          const err = e instanceof Error ? e : new Error("Unknown error")
          setError(err)
          onError?.(err)
        }
      })
    },
    [action, onSuccess, onError]
  )

  return { execute, isPending, error }
}

/**
 * Hook for debounced values
 * Useful for search-as-you-type functionality
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for debounced callback
 * Useful for search handlers that should wait for user to stop typing
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number = 300
): T {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId)
      const id = setTimeout(() => callback(...args), delay)
      setTimeoutId(id)
    },
    [callback, delay, timeoutId]
  ) as T

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [timeoutId])

  return debouncedCallback
}
