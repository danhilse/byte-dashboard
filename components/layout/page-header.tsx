"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Briefcase,
  HelpCircle,
  LayoutDashboard,
  ListTodo,
  Loader2,
  Search,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { Contact, Task, WorkflowExecution } from "@/types"

interface BreadcrumbItemType {
  label: string
  href?: string
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItemType[]
  actions?: React.ReactNode
}

interface SearchContact {
  id: string
  name: string
  email?: string
  company?: string
}

interface SearchTask {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  contactName?: string
}

interface SearchWorkflow {
  id: string
  definitionName?: string
  contactName?: string
  status: string
  workflowExecutionState?: string
}

interface SearchState {
  contacts: SearchContact[]
  tasks: SearchTask[]
  workflows: SearchWorkflow[]
}

const QUICK_LINKS = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Overview and metrics",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: "overview home stats",
  },
  {
    id: "my-work",
    label: "My Work",
    description: "Assigned tasks and approvals",
    href: "/my-work",
    icon: Briefcase,
    keywords: "tasks approvals work",
  },
  {
    id: "workflows",
    label: "Workflows",
    description: "Workflow executions",
    href: "/workflows",
    icon: Workflow,
    keywords: "executions pipeline process",
  },
  {
    id: "people",
    label: "People",
    description: "Contacts and profiles",
    href: "/people",
    icon: Users,
    keywords: "contacts crm",
  },
  {
    id: "support",
    label: "Support",
    description: "Help center",
    href: "/support",
    icon: HelpCircle,
    keywords: "help docs support",
  },
] as const

const MAX_RESULTS_PER_GROUP = 6
const EMPTY_SEARCH_STATE: SearchState = {
  contacts: [],
  tasks: [],
  workflows: [],
}

type SearchTaskApi = Task & { contactName?: string }

function includesQuery(values: Array<string | undefined>, query: string): boolean {
  return values.some((value) => value?.toLowerCase().includes(query))
}

export function PageHeader({ breadcrumbs, actions }: PageHeaderProps) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchData, setSearchData] = React.useState<SearchState>(EMPTY_SEARCH_STATE)
  const [searchLoaded, setSearchLoaded] = React.useState(false)
  const [searchLoading, setSearchLoading] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)

  const loadSearchData = React.useCallback(async () => {
    setSearchLoading(true)
    setSearchError(null)

    try {
      const [contactsRes, tasksRes, workflowsRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/tasks?assignee=me"),
        fetch("/api/workflows"),
      ])

      if (!contactsRes.ok || !tasksRes.ok || !workflowsRes.ok) {
        throw new Error("Search index fetch failed")
      }

      const [contactsPayload, tasksPayload, workflowsPayload] = await Promise.all([
        contactsRes.json() as Promise<{ contacts?: Contact[] }>,
        tasksRes.json() as Promise<{ tasks?: SearchTaskApi[] }>,
        workflowsRes.json() as Promise<{ workflows?: WorkflowExecution[] }>,
      ])

      const contacts = (contactsPayload.contacts ?? []).map((contact) => ({
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`.trim() || "Unnamed contact",
        email: contact.email || undefined,
        company: contact.company || undefined,
      }))

      const tasks = (tasksPayload.tasks ?? []).map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        status: task.status,
        priority: task.priority,
        contactName: task.contactName || undefined,
      }))

      const workflows = (workflowsPayload.workflows ?? []).map((workflow) => ({
        id: workflow.id,
        definitionName: workflow.definitionName || undefined,
        contactName: workflow.contactName || undefined,
        status: workflow.status,
        workflowExecutionState: workflow.workflowExecutionState,
      }))

      setSearchData({ contacts, tasks, workflows })
      setSearchLoaded(true)
    } catch (error) {
      console.error("Error loading header search data:", error)
      setSearchError("Unable to load search right now.")
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredLinks = React.useMemo(() => {
    if (!normalizedQuery) return QUICK_LINKS

    return QUICK_LINKS.filter((item) =>
      includesQuery([item.label, item.description, item.keywords], normalizedQuery)
    )
  }, [normalizedQuery])

  const filteredContacts = React.useMemo(() => {
    if (!normalizedQuery) return searchData.contacts.slice(0, MAX_RESULTS_PER_GROUP)

    return searchData.contacts
      .filter((contact) => includesQuery([contact.name, contact.email, contact.company], normalizedQuery))
      .slice(0, MAX_RESULTS_PER_GROUP)
  }, [normalizedQuery, searchData.contacts])

  const filteredTasks = React.useMemo(() => {
    if (!normalizedQuery) return searchData.tasks.slice(0, MAX_RESULTS_PER_GROUP)

    return searchData.tasks
      .filter((task) =>
        includesQuery([task.title, task.description, task.status, task.priority, task.contactName], normalizedQuery)
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
  }, [normalizedQuery, searchData.tasks])

  const filteredWorkflows = React.useMemo(() => {
    if (!normalizedQuery) return searchData.workflows.slice(0, MAX_RESULTS_PER_GROUP)

    return searchData.workflows
      .filter((workflow) =>
        includesQuery(
          [workflow.definitionName, workflow.contactName, workflow.status, workflow.workflowExecutionState],
          normalizedQuery
        )
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
  }, [normalizedQuery, searchData.workflows])

  const resultCount =
    filteredLinks.length + filteredContacts.length + filteredTasks.length + filteredWorkflows.length

  const handleSearchNavigate = React.useCallback((href: string) => {
    setSearchOpen(false)
    setSearchQuery("")
    router.push(href)
  }, [router])

  React.useEffect(() => {
    if (!searchOpen || searchLoaded || searchLoading) return
    void loadSearchData()
  }, [loadSearchData, searchLoaded, searchLoading, searchOpen])

  React.useEffect(() => {
    if (searchOpen) return
    setSearchQuery("")
  }, [searchOpen])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

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
          <PopoverContent className="w-[28rem] p-0 shadow-refined-lg animate-scale-in" align="end">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search contacts, tasks, workflows..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                autoFocus
              />
              <CommandList className="max-h-[420px]">
                {searchLoading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading search index...
                  </div>
                )}

                {!searchLoading && searchError && (
                  <div className="space-y-3 px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">{searchError}</p>
                    <Button size="sm" variant="outline" onClick={() => void loadSearchData()}>
                      Retry
                    </Button>
                  </div>
                )}

                {!searchLoading && !searchError && (
                  <>
                    {filteredLinks.length > 0 && (
                      <CommandGroup heading="Pages">
                        {filteredLinks.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={`page-${item.label}`}
                            onSelect={() => handleSearchNavigate(item.href)}
                          >
                            <item.icon className="size-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span>{item.label}</span>
                              <span className="text-xs text-muted-foreground">{item.description}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {filteredContacts.length > 0 && (
                      <CommandGroup heading="Contacts">
                        {filteredContacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={`contact-${contact.name}-${contact.email ?? ""}`}
                            onSelect={() => handleSearchNavigate(`/people/${contact.id}`)}
                          >
                            <Users className="size-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span>{contact.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {contact.email ?? contact.company ?? "Open contact"}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {filteredTasks.length > 0 && (
                      <CommandGroup heading="Tasks">
                        {filteredTasks.map((task) => (
                          <CommandItem
                            key={task.id}
                            value={`task-${task.title}-${task.description ?? ""}`}
                            onSelect={() =>
                              handleSearchNavigate(`/my-work?taskId=${encodeURIComponent(task.id)}`)
                            }
                          >
                            <ListTodo className="size-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="line-clamp-1">{task.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {task.contactName
                                  ? `${task.contactName} • ${task.status}`
                                  : `${task.status} • ${task.priority}`}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {filteredWorkflows.length > 0 && (
                      <CommandGroup heading="Workflows">
                        {filteredWorkflows.map((workflow) => (
                          <CommandItem
                            key={workflow.id}
                            value={`workflow-${workflow.definitionName ?? ""}-${workflow.contactName ?? ""}`}
                            onSelect={() => handleSearchNavigate(`/workflows/${workflow.id}`)}
                          >
                            <Workflow className="size-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="line-clamp-1">{workflow.definitionName ?? "Workflow execution"}</span>
                              <span className="text-xs text-muted-foreground">
                                {workflow.contactName
                                  ? `${workflow.contactName} • ${workflow.status}`
                                  : workflow.status}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {resultCount === 0 && (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {`No results found for "${searchQuery.trim()}".`}
                      </div>
                    )}
                  </>
                )}
              </CommandList>
            </Command>

            <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
              <span>
                Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">⌘K</kbd>
                {" / "}
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">Ctrl+K</kbd>
              </span>
              {searchLoaded && !searchLoading && !searchError && (
                <span>{searchData.contacts.length + searchData.tasks.length + searchData.workflows.length} indexed</span>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* AI Assistant */}
        <Button variant="ghost" size="icon" className="h-9 w-9 relative group">
          <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:text-primary" />
          <span className="sr-only">AI Assistant</span>
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
        </Button>

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
