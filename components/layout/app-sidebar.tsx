"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Briefcase,
  Users,
  HelpCircle,
  GitBranch,
  FileEdit,
  Settings,
  LogOut,
  ChevronUp,
  FileText,
} from "lucide-react"
import { useUser, useClerk } from "@clerk/nextjs"
import { useIsAdmin } from "@/hooks/use-org-role"
import {
  PRIMARY_ROUTE_DEFINITIONS,
  ADMIN_ROUTE_DEFINITIONS,
} from "@/components/layout/navigation-routes"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const primaryNavIcons = {
  dashboard: LayoutDashboard,
  "my-work": Briefcase,
  workflows: FileText,
  people: Users,
  support: HelpCircle,
} as const

const adminNavIcons = {
  "workflow-builder": GitBranch,
  assets: FileText,
  forms: FileEdit,
  settings: Settings,
} as const

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()
  const isAdmin = useIsAdmin()

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "U"

  const userName = user?.fullName ?? user?.emailAddresses?.[0]?.emailAddress ?? "User"
  const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? ""

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="overflow-visible group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
            >
              <Link href="/dashboard" className="group/logo">
                <div className="flex aspect-square size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm transition-[border-radius,box-shadow] duration-200 group-hover/logo:shadow-md group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:shadow-none">
                  <span className="text-[15px] font-bold leading-none tracking-tight">B</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold tracking-tight">Byte</span>
                  <span className="truncate text-xs text-muted-foreground">Workflow Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Primary</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY_ROUTE_DEFINITIONS.map((item) => {
                const Icon = primaryNavIcons[item.id as keyof typeof primaryNavIcons]
                if (!Icon) return null

                return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_ROUTE_DEFINITIONS.map((item) => {
                  const Icon = adminNavIcons[item.id as keyof typeof adminNavIcons]
                  if (!Icon) return null

                  return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActiveRoute(item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={user?.imageUrl} alt={userName} />
                    <AvatarFallback className="bg-primary/10 text-primary">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings/general">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings/billing">Billing & Plans</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/" })}>
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
