import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { QuickAddFab } from "@/components/layout/quick-add-fab"
import { RouteTitleSync } from "@/components/layout/route-title-sync"
import { cookies } from "next/headers"

const SIDEBAR_COOKIE_NAME = "sidebar_state"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <RouteTitleSync />
      <AppSidebar />
      <SidebarInset className="min-w-0">
        {children}
        <QuickAddFab />
      </SidebarInset>
    </SidebarProvider>
  )
}
