"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { APP_NAME, toPageTitle } from "@/components/layout/navigation-routes"

export function RouteTitleSync() {
  const pathname = usePathname()

  useEffect(() => {
    const pageTitle = toPageTitle(pathname)
    document.title = pageTitle === APP_NAME ? APP_NAME : `${pageTitle} | ${APP_NAME}`
  }, [pathname])

  return null
}
