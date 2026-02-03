"use client"

import * as React from "react"
import { Search, Sparkles, Plus, Bell, User, CheckSquare, Workflow, Headphones, FileText } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface BreadcrumbItemType {
  label: string
  href?: string
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItemType[]
  actions?: React.ReactNode
}

const quickAddItems = [
  { label: "Person", icon: User, href: "/people" },
  { label: "Task", icon: CheckSquare, href: "/my-work?tab=tasks" },
  { label: "Workflow", icon: Workflow, href: "/workflow-builder" },
  { label: "Support Ticket", icon: Headphones, href: "/support" },
  { label: "Application", icon: FileText, href: "/my-work?tab=applications" },
]

export function PageHeader({ breadcrumbs, actions }: PageHeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false)

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <React.Fragment key={item.label}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        {actions}

        {/* Search */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="end">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground text-center py-4">
              Type to search across contacts, tasks, and more...
            </div>
          </PopoverContent>
        </Popover>

        {/* AI Assistant */}
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sparkles className="h-4 w-4" />
          <span className="sr-only">AI Assistant</span>
        </Button>

        {/* Quick Add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Quick Add</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Quick Add</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {quickAddItems.map((item) => (
              <DropdownMenuItem key={item.label} asChild>
                <a href={item.href} className="flex items-center gap-2 cursor-pointer">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
                Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-6 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-4" />
        <ThemeToggle />
      </div>
    </header>
  )
}
