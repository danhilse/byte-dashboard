"use client"

import * as React from "react"
import { Search, Sparkles, Plus, Bell, User, CheckSquare, Workflow, Headphones } from "lucide-react"
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
  { label: "Task", icon: CheckSquare, href: "/my-work" },
  { label: "Workflow Execution", icon: Workflow, href: "/workflows" },
  { label: "Workflow Builder V2", icon: Workflow, href: "/builder-test" },
  { label: "Support Ticket", icon: Headphones, href: "/support" },
]

export function PageHeader({ breadcrumbs, actions }: PageHeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false)

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sticky top-0 z-10">
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
            <Button variant="ghost" size="icon" className="h-9 w-9 relative group">
              <Search className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="sr-only">Search</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-3 shadow-refined-lg animate-scale-in" align="end">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts, tasks, workflows..."
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                autoFocus
              />
            </div>
            <div className="mt-3 text-xs text-muted-foreground text-center py-3 border-t">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-medium">⌘K</kbd> for quick access
            </div>
          </PopoverContent>
        </Popover>

        {/* AI Assistant */}
        <Button variant="ghost" size="icon" className="h-9 w-9 relative group">
          <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:text-primary" />
          <span className="sr-only">AI Assistant</span>
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
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
            <Button variant="ghost" size="icon" className="h-9 w-9 relative group">
              <Bell className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="sr-only">Notifications</span>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/50 animate-pulse" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 shadow-refined-lg animate-scale-in">
            <DropdownMenuLabel className="flex items-center justify-between py-3">
              <span className="font-semibold">Notifications</span>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary transition-colors">
                Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-8 text-center text-sm text-muted-foreground">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                <Bell className="h-5 w-5 text-muted-foreground/50" />
              </div>
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
