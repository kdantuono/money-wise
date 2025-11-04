'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * ClientOnly Component
 *
 * Prevents React hydration mismatches caused by browser extensions (Dashlane, LastPass, 1Password, Bitwarden)
 * that inject DOM elements during page load.
 *
 * How it works:
 * - Returns null on server-side render (no HTML output)
 * - Returns null on initial client mount (matches server output)
 * - Returns children after useEffect runs (safe from hydration)
 *
 * This ensures the component only renders on the client AFTER hydration is complete,
 * preventing mismatches between server HTML and client HTML modified by extensions.
 *
 * @example
 * <ClientOnly fallback={<LoadingSkeleton />}>
 *   <FormWithAutoFill />
 * </ClientOnly>
 */
interface ClientOnlyProps {
  /** Content to render only on client-side after hydration */
  children: ReactNode
  /** Optional fallback to show during server render and initial client mount */
  fallback?: ReactNode
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
