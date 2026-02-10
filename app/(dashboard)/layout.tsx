import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { QuickAddFab } from "@/components/layout/quick-add-fab"
import { RouteTitleSync } from "@/components/layout/route-title-sync"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <RouteTitleSync />
      <AppSidebar />
      <SidebarInset className="min-w-0">
        {children}
        <QuickAddFab />
      </SidebarInset>
    </SidebarProvider>
  )
}
